// FILE: backend/src/services/previousSchools.service.js
const AppError = require('../utils/AppError');
const repository = require('../repositories/previousSchools.repository');
const studentsRepository = require('../repositories/students.repository');
const { generateCode } = require('../utils/codeGenerator');
const auditService = require('./audit.service');
const { pick } = require('../utils/pick');
// FIX (auditoria hallazgo C1 - aislamiento por sede)
const { scopeFiltersToUserBranches, assertBranchAccess } = require('../utils/branchScope');

// FIX (auditoria hallazgo #5 - mass assignment): whitelist explícita de
// columnas reales de la tabla que el cliente puede escribir. Cualquier
// otro campo del body se ignora en vez de llegar crudo al INSERT/UPDATE.
const ALLOWED_FIELDS = ['student_id', 'school_name', 'address', 'phone', 'grade_level', 'year_attended', 'transcript_received', 'notes'];

// FIX (aislamiento por sede, C1): create()/findByStudent() nunca validaban
// que el student_id referenciado perteneciera a una sede del usuario.
async function assertStudentBranchAccess(studentId, user, notFoundMessage) {
  const student = await studentsRepository.findById(studentId);
  assertBranchAccess(student, user, notFoundMessage);
  return student;
}

const PreviousSchoolsService = {
  async findAll(filters, user) {
    const { page = 1, pageSize = 20, search, studentId, schoolName } = filters;
    const queryFilters = scopeFiltersToUserBranches({ search, studentId, schoolName }, user);
    const [data, total] = await Promise.all([
      repository.findAll({ ...queryFilters, page, pageSize }),
      repository.count(queryFilters),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  },

  async findById(id, user) {
    const record = await repository.findById(id);
    assertBranchAccess(record, user, 'Previous school record not found');
    return record;
  },

  async findByStudent(studentId, user) {
    await assertStudentBranchAccess(studentId, user, 'Student not found');
    return repository.findByStudent(studentId);
  },

  async create(payload, user, req) {
    if (!payload.student_id) throw new AppError('student_id is required', 400);
    await assertStudentBranchAccess(payload.student_id, user, 'Student not found');
    const code = await generateCode('PSC');
    const data = {
      ...pick(payload, ALLOWED_FIELDS),
      code,
      created_by: user.id,
      updated_by: user.id
    };
    const [id] = await repository.create(data);
    const record = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'CREATE',
      module: 'previous-schools',
      recordCode: code,
      after: record,
      req
    });
    
    return record;
  },

  async update(id, payload, user, req) {
    const existing = await repository.findById(id);
    assertBranchAccess(existing, user, 'Previous school record not found');
    
    const before = { ...existing };
    await repository.update(id, { ...pick(payload, ALLOWED_FIELDS), updated_by: user.id });
    const after = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'UPDATE',
      module: 'previous-schools',
      recordCode: existing.code,
      before,
      after,
      req
    });
    
    return after;
  },

  async softDelete(id, user, req) {
    const existing = await repository.findById(id);
    assertBranchAccess(existing, user, 'Previous school record not found');
    
    await repository.softDelete(id, user.id);
    
    await auditService.log({
      user,
      action: 'DELETE',
      module: 'previous-schools',
      recordCode: existing.code,
      before: existing,
      req
    });
    
    return true;
  }
};

module.exports = PreviousSchoolsService;
