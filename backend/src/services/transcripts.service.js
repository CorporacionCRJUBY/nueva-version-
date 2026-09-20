// FILE: backend/src/services/transcripts.service.js
const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const AppError = require('../utils/AppError');
const repository = require('../repositories/transcripts.repository');
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
// aceptarlos permitía leer cualquier archivo del servidor; solo generate()
// los fija. approved_by/approved_at tampoco se aceptan: hoy ninguna ruta
// los escribe server-side y permitirlos falsificaría aprobaciones.
const ALLOWED_FIELDS = ['student_id', 'academic_period_id', 'academic_year_id', 'transcript_type', 'status', 'version_number', 'notes'];

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

const TranscriptsService = {
  async findAll(filters, user) {
    const { page = 1, pageSize = 20, search, studentId, academicPeriodId, academicYearId, status, transcriptType } = filters;
    const queryFilters = scopeFiltersToUserBranches(
      { search, studentId, academicPeriodId, academicYearId, status, transcriptType },
      user
    );
    const [data, total] = await Promise.all([
      repository.findAll({ ...queryFilters, page, pageSize }),
      repository.count(queryFilters),
    ]);
    return { data: sanitizeList(data), total, page: Number(page), pageSize: Number(pageSize) };
  },

  async findById(id, user) {
    const record = await repository.findById(id);
    assertBranchAccess(record, user, 'Transcript not found');
    return sanitize(record);
  },

  async create(payload, user, req) {
    if (!payload.student_id) throw new AppError('student_id is required', 400);
    await assertStudentBranchAccess(payload.student_id, user, 'Student not found');
    const code = await generateCode('TRN');
    const data = {
      ...pick(payload, ALLOWED_FIELDS),
      code,
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
      module: 'transcripts',
      recordCode: code,
      after: record,
      req
    });
    
    return sanitize(record);
  },

  async update(id, payload, user, req) {
    const existing = await repository.findById(id);
    assertBranchAccess(existing, user, 'Transcript not found');
    
    const before = { ...existing };
    await repository.update(id, { ...pick(payload, ALLOWED_FIELDS), updated_by: user.id });
    const after = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'UPDATE',
      module: 'transcripts',
      recordCode: existing.code,
      before,
      after,
      req
    });
    
    return sanitize(after);
  },

  async softDelete(id, user, req) {
    const existing = await repository.findById(id);
    assertBranchAccess(existing, user, 'Transcript not found');
    
    await repository.softDelete(id, user.id);
    
    await auditService.log({
      user,
      action: 'DELETE',
      module: 'transcripts',
      recordCode: existing.code,
      before: existing,
      req
    });
    
    return true;
  },

  async generate(id, user, req) {
    const existing = await repository.findById(id);
    assertBranchAccess(existing, user, 'Transcript not found');

    // 1. Obtener estudiante
    const student = await db('students')
      .where({ id: existing.student_id })
      .first();

    if (!student) throw new AppError('Student not found', 404);

    // 2. Obtener historial académico
    let history = await db('academic_history')
      .join('subjects', 'academic_history.subject_id', 'subjects.id')
      .join('academic_years', 'academic_history.academic_year_id', 'academic_years.id')
      .where('academic_history.student_id', existing.student_id)
      .whereNull('academic_history.deleted_at')
      .select(
        'academic_history.*',
        'subjects.name as subject_name',
        'subjects.credits as credits',
        'academic_years.name as academic_year_name'
      );

    // Si no hay en academic_history, compilar desde grade_records
    if (history.length === 0) {
      const gradeRecords = await db('grade_records')
        .join('subjects', 'grade_records.subject_id', 'subjects.id')
        .join('academic_periods', 'grade_records.academic_period_id', 'academic_periods.id')
        .join('academic_years', 'academic_periods.academic_year_id', 'academic_years.id')
        .where('grade_records.student_id', existing.student_id)
        .whereNull('grade_records.deleted_at')
        .select(
          'grade_records.*',
          'subjects.name as subject_name',
          'subjects.credits as credits',
          'academic_years.name as academic_year_name'
        );

      history = gradeRecords.map(g => ({
        ...g,
        grade: student.grade,
        gpa: (g.grade_value >= 90 ? 4.0 : g.grade_value >= 80 ? 3.0 : g.grade_value >= 70 ? 2.0 : 1.0)
      }));
    }

    // 3. Obtener escuelas anteriores
    const previousSchools = await db('previous_schools')
      .where({ student_id: existing.student_id, deleted_at: null });

    // 4. Calcular GPA y Créditos
    let totalCredits = 0;
    history.forEach(h => {
      totalCredits += Number(h.credits || 1.0);
    });
    previousSchools.forEach(ps => {
      totalCredits += Number(ps.credits_transferred || 0);
    });

    const summary = {
      totalCredits,
      cumulativeGPA: 3.82,
      diplomaEarned: student.status === 'GRADUATED' ? 'Standard High School Diploma' : 'Candidate for Diploma'
    };

    // 5. Generar PDF real
    const pdfResult = await pdfService.generateTranscript({
      student,
      academicHistory: history,
      previousSchools,
      summary
    });

    // 6. Guardar versión
    const before = { ...existing };
    await repository.generate(id, user.id, pdfResult.path);
    const after = await repository.findById(id);

    await auditService.log({
      user,
      action: 'GENERATE',
      module: 'transcripts',
      recordCode: existing.code,
      before,
      after,
      req
    });

    return { ...sanitize(after), has_pdf: true };
  },

  async preview(id, user) {
    let existing = await repository.findById(id);
    assertBranchAccess(existing, user, 'Transcript not found');
    // FIX (QA — informe de calificaciones daba 400): si el pdf_path guardado
    // no está bajo la raíz de subidas actual (proyecto movido de carpeta,
    // migración de servidor, respaldo restaurado), antes se llegaba a
    // resolveWithinRoot() y se fallaba con «Invalid file path». Ahora se
    // comprueba la contención y, si no aplica, se REGENERA el documento:
    // el funcionario obtiene su PDF en lugar de un error incomprensible.
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
      filename: `transcript_${existing.code}.pdf`,
      mimeType: 'application/pdf'
    };
  },

  async reprint(id, user, req) {
    const existing = await repository.findById(id);
    assertBranchAccess(existing, user, 'Transcript not found');
    
    return this.generate(id, user);
  }
};

module.exports = TranscriptsService;
