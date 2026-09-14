// FILE: backend/src/services/grades.service.js
const db = require('../config/database');
const AppError = require('../utils/AppError');
const repository = require('../repositories/grades.repository');
const studentsRepository = require('../repositories/students.repository');
const { generateCode } = require('../utils/codeGenerator');
const { convertToLetterGrade } = require('../utils/gpaCalculator');
const auditService = require('./audit.service');
const { pick } = require('../utils/pick');
// FIX (auditoria hallazgo C1 - aislamiento por sede)
const { scopeFiltersToUserBranches, assertBranchAccess } = require('../utils/branchScope');

// FIX (auditoria hallazgo #5 - mass assignment): whitelist explícita de
// columnas reales de la tabla que el cliente puede escribir. Cualquier
// otro campo del body se ignora en vez de llegar crudo al INSERT/UPDATE.
const ALLOWED_FIELDS = ['student_id', 'subject_id', 'assignment_id', 'academic_period_id', 'grade_value', 'grade_letter', 'weight', 'status', 'edit_deadline'];

const GradesService = {
  async findAll(filters, user) {
    const { page = 1, pageSize = 20, search, studentId, subjectId, assignmentId, academicPeriodId, status } = filters;
    const queryFilters = scopeFiltersToUserBranches({ search, studentId, subjectId, assignmentId, academicPeriodId, status }, user);
    const [data, total] = await Promise.all([
      repository.findAll({ ...queryFilters, page, pageSize }),
      repository.count(queryFilters),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  },

  async findById(id, user) {
    const record = await repository.findById(id);
    assertBranchAccess(record, user, 'Grade record not found');
    return record;
  },

  async create(payload, user, req) {
    // FIX (aislamiento por sede, M3): solo se pueden crear calificaciones
    // para estudiantes de las sedes del usuario.
    if (!payload.student_id) throw new AppError('student_id is required', 400);
    const student = await studentsRepository.findById(payload.student_id);
    assertBranchAccess(student, user, 'Student not found');
    const code = await generateCode('GRA');
    const gradeLetter = payload.grade_letter || convertToLetterGrade(payload.grade_value);

    const data = {
      ...pick(payload, ALLOWED_FIELDS),
      code,
      grade_letter: gradeLetter,
      status: payload.status || 'DRAFT',
      edit_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      created_by: user.id,
      updated_by: user.id
    };
    const [id] = await repository.create(data);
    const record = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'CREATE',
      module: 'grades',
      recordCode: code,
      after: record,
      req
    });
    
    return record;
  },

  async update(id, payload, user, req) {
    const existing = await repository.findById(id);
    assertBranchAccess(existing, user, 'Grade record not found');
    
    // Check if grade is locked
    if (existing.status === 'LOCKED') {
      const error = new AppError('The 24-hour grade modification window has expired. Please submit a Grade Change Request.', 423);
      error.code = 'GRADE_EDIT_WINDOW_EXPIRED';
      throw error;
    }
    
    // Check if deadline has passed
    const now = new Date();
    const deadline = new Date(existing.edit_deadline);
    if (deadline < now && existing.status !== 'UNLOCKED') {
      // Auto-lock and reject update
      await repository.lock(id, user.id);
      const error = new AppError('The 24-hour grade modification window has expired. Please submit a Grade Change Request.', 423);
      error.code = 'GRADE_EDIT_WINDOW_EXPIRED';
      throw error;
    }
    
    const before = { ...existing };
    const gradeLetter = payload.grade_value !== undefined ? convertToLetterGrade(payload.grade_value) : existing.grade_letter;
    
    await repository.update(id, {
      ...pick(payload, ALLOWED_FIELDS),
      grade_letter: gradeLetter,
      updated_by: user.id
    });
    const after = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'UPDATE',
      module: 'grades',
      recordCode: existing.code,
      before,
      after,
      req
    });
    
    return after;
  },

  async softDelete(id, user, req) {
    const existing = await repository.findById(id);
    assertBranchAccess(existing, user, 'Grade record not found');
    if (existing.status === 'LOCKED') throw new AppError('Cannot delete a locked grade', 409);
    
    await repository.softDelete(id, user.id);
    
    await auditService.log({
      user,
      action: 'DELETE',
      module: 'grades',
      recordCode: existing.code,
      before: existing,
      req
    });
    
    return true;
  },

  async lockExpiredGrades() {
    const now = new Date();
    const count = await db('grade_records')
      .where('edit_deadline', '<', now)
      .whereNotIn('status', ['LOCKED', 'UNLOCKED'])
      .whereNull('deleted_at')
      .update({
        status: 'LOCKED',
        updated_at: db.fn.now()
      });
    return count;
  }
};

module.exports = GradesService;
