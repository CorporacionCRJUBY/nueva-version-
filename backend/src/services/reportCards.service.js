// FILE: backend/src/services/reportCards.service.js
const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const AppError = require('../utils/AppError');
const repository = require('../repositories/reportCards.repository');
const studentsRepository = require('../repositories/students.repository');
const { generateCode } = require('../utils/codeGenerator');
const auditService = require('./audit.service');
const pdfService = require('./pdf.service');
const { pick } = require('../utils/pick');
// FIX (auditoria hallazgo C1 - aislamiento por sede)
const { scopeFiltersToUserBranches, assertBranchAccess } = require('../utils/branchScope');
// SEGURIDAD (auditoria 2026-08-31, crítico C3): contención de rutas
const { resolveWithinRoot, isPathWithinRoot } = require('../utils/safePath');

const uploadsRoot = path.resolve(__dirname, '../../uploads');

// FIX (auditoria hallazgo #5 - mass assignment): whitelist explícita de
// columnas reales de la tabla que el cliente puede escribir. Cualquier
// otro campo del body se ignora en vez de llegar crudo al INSERT/UPDATE.
// SEGURIDAD (crítico C3): pdf_path/pdf_url/generated_by NO son escribibles
// por el cliente — preview() sirve pdf_path con createReadStream y
// aceptarlos permitía leer cualquier archivo del servidor. Solo generate()
// (server-side) los fija.
const ALLOWED_FIELDS = ['category', 'student_id', 'academic_period_id', 'academic_year_id', 'report_date', 'status', 'version_number', 'notes'];

// NOTA DE SEGURIDAD: pdf_path es una ruta absoluta del servidor y pdf_url
// apuntaba a la antigua carpeta pública /uploads (ya eliminada, ver app.js).
// Nunca deben llegar al cliente crudos — solo se expone un flag has_pdf.
// El archivo real solo se sirve vía preview()/download(), que leen el
// registro crudo del repositorio directamente, no estos métodos saneados.
const sanitize = (record) => {
  if (!record) return record;
  const { pdf_path, pdf_url, ...safe } = record;
  return { ...safe, has_pdf: Boolean(pdf_path) };
};
const sanitizeList = (records) => records.map(sanitize);

// FIX (aislamiento por sede, C1): create() nunca validaba que el student_id
// referenciado perteneciera a una sede del usuario.
async function assertStudentBranchAccess(studentId, user, notFoundMessage) {
  const student = await studentsRepository.findById(studentId);
  assertBranchAccess(student, user, notFoundMessage);
  return student;
}

const ReportCardsService = {
  async findAll(filters, user) {
    const { page = 1, pageSize = 20, search, studentId, academicPeriodId, academicYearId, status } = filters;
    const queryFilters = scopeFiltersToUserBranches({ search, studentId, academicPeriodId, academicYearId, status }, user);
    const [data, total] = await Promise.all([
      repository.findAll({ ...queryFilters, page, pageSize }),
      repository.count(queryFilters),
    ]);
    return { data: sanitizeList(data), total, page: Number(page), pageSize: Number(pageSize) };
  },

  async findById(id, user) {
    const record = await repository.findById(id);
    assertBranchAccess(record, user, 'Report card not found');
    return sanitize(record);
  },

  async create(payload, user, req) {
    if (!payload.student_id) throw new AppError('student_id is required', 400);
    await assertStudentBranchAccess(payload.student_id, user, 'Student not found');
    const code = await generateCode('REP');
    const data = {
      ...pick(payload, ALLOWED_FIELDS),
      category: 'report-cards',
      code,
      // FIX (auditoria hallazgo #4): la columna `report_date` es
      // NOT NULL sin default en la base, pero el validador la marca como
      // opcional. Sin este fallback, omitir el campo (comportamiento
      // válido según el validador) hacía explotar el INSERT con un 500
      // crudo de MySQL (ER_NO_DEFAULT_FOR_FIELD).
      report_date: payload.report_date || new Date(),
      status: payload.status || 'DRAFT',
      version_number: 1,
      created_by: user.id,
      updated_by: user.id
    };
    const [id] = await repository.create(data);
    const record = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'CREATE',
      module: 'report-cards',
      recordCode: code,
      after: record,
      req
    });
    
    return sanitize(record);
  },

  async update(id, payload, user, req) {
    const existing = await repository.findById(id);
    assertBranchAccess(existing, user, 'Report card not found');
    
    const before = { ...existing };
    await repository.update(id, { ...pick(payload, ALLOWED_FIELDS), updated_by: user.id });
    const after = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'UPDATE',
      module: 'report-cards',
      recordCode: existing.code,
      before,
      after,
      req
    });
    
    return sanitize(after);
  },

  async softDelete(id, user, req) {
    const existing = await repository.findById(id);
    assertBranchAccess(existing, user, 'Report card not found');
    
    await repository.softDelete(id, user.id);
    
    await auditService.log({
      user,
      action: 'DELETE',
      module: 'report-cards',
      recordCode: existing.code,
      before: existing,
      req
    });
    
    return true;
  },

  async generate(id, user, req) {
    const existing = await repository.findById(id);
    assertBranchAccess(existing, user, 'Report card not found');

    // 1. Obtener estudiante
    const student = await db('students')
      .where({ id: existing.student_id })
      .first();

    if (!student) throw new AppError('Student not found', 404);

    // 2. Obtener calificaciones del estudiante agrupadas por materia
    const gradeRows = await db('grade_records')
      .join('subjects', 'grade_records.subject_id', 'subjects.id')
      .join('academic_periods', 'grade_records.academic_period_id', 'academic_periods.id')
      .where('grade_records.student_id', existing.student_id)
      .whereNull('grade_records.deleted_at')
      .select(
        'subjects.name as subject_name',
        'academic_periods.code as period_code',
        'grade_records.grade_value'
      );

    const subjectsMap = {};
    gradeRows.forEach(row => {
      if (!subjectsMap[row.subject_name]) {
        subjectsMap[row.subject_name] = { subject_name: row.subject_name };
      }
      if (row.period_code === 'Q1') subjectsMap[row.subject_name].q1_report = row.grade_value;
      if (row.period_code === 'Q2') subjectsMap[row.subject_name].q2_report = row.grade_value;
      if (row.period_code === 'Q3') subjectsMap[row.subject_name].q3_report = row.grade_value;
      if (row.period_code === 'Q4') subjectsMap[row.subject_name].q4_report = row.grade_value;
    });

    // Calcular notas finales por materia
    Object.keys(subjectsMap).forEach(k => {
      const item = subjectsMap[k];
      const vals = [item.q1_report, item.q2_report, item.q3_report, item.q4_report].filter(v => v !== undefined);
      if (vals.length > 0) {
        const sum = vals.reduce((a, b) => a + Number(b), 0);
        item.final = Math.round(sum / vals.length);
      }
    });

    const gradesList = Object.values(subjectsMap);

    // 3. Obtener resumen de asistencia
    const attendanceRecords = await db('attendance_records')
      .where({ student_id: existing.student_id, deleted_at: null });

    let countP = 0, countO = 0, countE = 0, countU = 0;
    attendanceRecords.forEach(r => {
      if (r.status === 'P') countP++;
      if (r.status === 'O') countO++;
      if (r.status === 'E') countE++;
      if (r.status === 'U') countU++;
    });

    const attendanceSummary = {
      q1_present: countP,
      q1_absence: countE + countU,
      q1_tardy: 0,
      total_present: countP + countO,
      total_absence: countE + countU,
      total_tardy: 0
    };

    // 4. Generar PDF real
    const pdfResult = await pdfService.generateReportCard({
      student,
      grades: gradesList,
      attendance: attendanceSummary,
      teacherName: 'Academic Faculty',
      reportType: 'OFFICIAL REPORT CARD'
    });

    // 5. Guardar versión y actualizar reporte
    const before = { ...existing };
    await repository.generate(id, user.id, pdfResult.path);
    const after = await repository.findById(id);

    await auditService.log({
      user,
      action: 'GENERATE',
      module: 'report-cards',
      recordCode: existing.code,
      before,
      after,
      req
    });

    return { ...sanitize(after), has_pdf: true };
  },

  async preview(id, user) {
    let existing = await repository.findById(id);
    assertBranchAccess(existing, user, 'Report card not found');
    // FIX (QA — mismo caso que transcripts): si el pdf_path guardado apunta
    // fuera de la raíz de subidas actual, se regenera en vez de fallar con 400.
    const pdfIsUsable = existing.pdf_path && fs.existsSync(existing.pdf_path)
      && isPathWithinRoot(uploadsRoot, existing.pdf_path);
    if (!pdfIsUsable) {
      await this.generate(id, user);
      existing = await repository.findById(id);
    }

    // SEGURIDAD (crítico C3): el stream solo se abre si pdf_path está
    // contenido en uploads/ (protege también contra filas legacy).
    const containedPdf = resolveWithinRoot(uploadsRoot, existing.pdf_path);

    return {
      stream: fs.createReadStream(containedPdf),
      filename: `report_card_${existing.code}.pdf`,
      mimeType: 'application/pdf'
    };
  }
};

module.exports = ReportCardsService;
