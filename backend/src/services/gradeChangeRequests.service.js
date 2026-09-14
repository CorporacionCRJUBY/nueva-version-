// FILE: backend/src/services/gradeChangeRequests.service.js
const db = require('../config/database');
const AppError = require('../utils/AppError');
const repository = require('../repositories/gradeChangeRequests.repository');
const studentsRepository = require('../repositories/students.repository');
const { generateCode } = require('../utils/codeGenerator');
const { convertToLetterGrade } = require('../utils/gpaCalculator');
const { scopeFiltersToUserBranches, assertBranchAccess } = require('../utils/branchScope');
const auditService = require('./audit.service');
const { pick } = require('../utils/pick');

// FIX (auditoria hallazgo #5 - mass assignment): whitelist explícita de
// columnas reales de la tabla que el cliente puede escribir. Cualquier
// otro campo del body se ignora en vez de llegar crudo al INSERT/UPDATE.
const ALLOWED_FIELDS = ['grade_record_id', 'student_id', 'requested_by', 'current_grade', 'requested_grade', 'reason', 'status', 'reviewed_by', 'reviewed_at', 'review_notes'];

// FIX (auditoria hallazgo alto #1 - bypass del flujo de aprobación):
// `update()` es el PUT genérico, protegido solo por `grade-change-requests.edit`
// (un permiso que puede tener, por ejemplo, el mismo docente que solicitó el
// cambio). El whitelist de arriba incluía `status`, `reviewed_by`,
// `reviewed_at` y `review_notes`, así que bastaba un PUT con
// `{ status: 'APPROVED' }` para marcar la solicitud como aprobada SIN pasar
// por `approve()` — sin escribir `grade_history`, sin tocar `grade_records`
// y sin que `grade-change-requests.approve` (el permiso de un revisor) se
// evaluara nunca. Esos cuatro campos son estado exclusivo del flujo de
// revisión: solo `approve()`/`reject()` (protegidos por `.approve`/`.reject`)
// pueden escribirlos.
const UPDATE_ALLOWED_FIELDS = ['grade_record_id', 'student_id', 'current_grade', 'requested_grade', 'reason'];

// FIX (aislamiento por sede, C1): create() nunca validaba que el student_id
// referenciado perteneciera a una sede del usuario.
async function assertStudentBranchAccess(studentId, user, notFoundMessage) {
  const student = await studentsRepository.findById(studentId);
  assertBranchAccess(student, user, notFoundMessage);
  return student;
}

const GradeChangeRequestsService = {
  async findAll(filters, user) {
    const { page = 1, pageSize = 20, studentId, gradeRecordId, status, dateFrom, dateTo } = filters;
    const queryFilters = scopeFiltersToUserBranches({ studentId, gradeRecordId, status, dateFrom, dateTo }, user);
    const [data, total] = await Promise.all([
      repository.findAll({ ...queryFilters, page, pageSize }),
      repository.count(queryFilters),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  },

  async findById(id, user) {
    const record = await repository.findById(id);
    assertBranchAccess(record, user, 'Grade change request not found');
    return record;
  },

  async create(payload, user, req) {
    if (!payload.student_id) throw new AppError('student_id is required', 400);
    await assertStudentBranchAccess(payload.student_id, user, 'Student not found');
    const code = await generateCode('REQ');
    const data = {
      ...pick(payload, ALLOWED_FIELDS),
      code,
      requested_by: user.id,
      status: 'PENDING',
      created_by: user.id,
      updated_by: user.id
    };
    const [id] = await repository.create(data);
    const record = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'CREATE',
      module: 'grade-change-requests',
      recordCode: code,
      after: record,
      req
    });
    
    return record;
  },

  async update(id, payload, user, req) {
    const existing = await repository.findById(id);
    assertBranchAccess(existing, user, 'Grade change request not found');
    if (existing.status !== 'PENDING') throw new AppError('Cannot update a request that is not pending', 409);
    if (payload.student_id) {
      await assertStudentBranchAccess(payload.student_id, user, 'Student not found');
    }
    
    const before = { ...existing };
    await repository.update(id, { ...pick(payload, UPDATE_ALLOWED_FIELDS), updated_by: user.id });
    const after = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'UPDATE',
      module: 'grade-change-requests',
      recordCode: existing.code,
      before,
      after,
      req
    });
    
    return after;
  },

  async softDelete(id, user, req) {
    const existing = await repository.findById(id);
    assertBranchAccess(existing, user, 'Grade change request not found');
    
    await repository.softDelete(id, user.id);
    
    await auditService.log({
      user,
      action: 'DELETE',
      module: 'grade-change-requests',
      recordCode: existing.code,
      before: existing,
      req
    });
    
    return true;
  },

  async approve(id, payload = {}, user, req) {
    const existing = await repository.findById(id);
    assertBranchAccess(existing, user, 'Grade change request not found');
    if (existing.status !== 'PENDING') throw new AppError('Request is not pending', 409);
    
    const { notes } = payload;
    const before = { ...existing };

    await db.transaction(async (trx) => {
      // 1. Actualizar estado de la solicitud
      await trx('grade_change_requests')
        .where({ id })
        .update({
          status: 'APPROVED',
          reviewed_by: user.id,
          reviewed_at: trx.fn.now(),
          review_notes: notes || null,
          updated_at: trx.fn.now()
        });

      // 2. Obtener el registro de calificación original
      const gradeRecord = await trx('grade_records')
        .where({ id: existing.grade_record_id })
        .first();

      if (gradeRecord) {
        const newLetter = convertToLetterGrade(existing.requested_grade);
        
        // 3. Registrar en grade_history
        await trx('grade_history').insert({
          grade_record_id: gradeRecord.id,
          from_grade: gradeRecord.grade_value,
          to_grade: existing.requested_grade,
          from_letter: gradeRecord.grade_letter,
          to_letter: newLetter,
          reason: existing.reason,
          changed_by: user.id,
          created_at: trx.fn.now()
        });

        // 4. Actualizar la calificación en grade_records y marcar como UNLOCKED
        await trx('grade_records')
          .where({ id: gradeRecord.id })
          .update({
            grade_value: existing.requested_grade,
            grade_letter: newLetter,
            status: 'UNLOCKED',
            updated_by: user.id,
            updated_at: trx.fn.now()
          });
      }
    });

    const after = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'APPROVE',
      module: 'grade-change-requests',
      recordCode: existing.code,
      before,
      after,
      req
    });
    
    return after;
  },

  async reject(id, payload = {}, user, req) {
    const existing = await repository.findById(id);
    assertBranchAccess(existing, user, 'Grade change request not found');
    if (existing.status !== 'PENDING') throw new AppError('Request is not pending', 409);
    
    const { notes } = payload;
    const before = { ...existing };
    
    await repository.reject(id, user.id, notes || null);
    const after = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'REJECT',
      module: 'grade-change-requests',
      recordCode: existing.code,
      before,
      after,
      req
    });
    
    return after;
  }
};

module.exports = GradeChangeRequestsService;
