// FILE: backend/src/services/gransif.service.js
const AppError = require('../utils/AppError');
const { scopeFiltersToUserBranches, assertBranchAccess } = require('../utils/branchScope');
const repository = require('../repositories/gransif.repository');
const studentsRepository = require('../repositories/students.repository');
const { generateCode } = require('../utils/codeGenerator');
const auditService = require('./audit.service');
const { pick } = require('../utils/pick');

// FIX (auditoria hallazgo #5 - mass assignment): whitelist explícita de
// columnas reales de la tabla que el cliente puede escribir. Cualquier
// otro campo del body se ignora en vez de llegar crudo al INSERT/UPDATE.
const ALLOWED_FIELDS = ['student_id', 'academic_year_id', 'assessment_date', 'score', 'status', 'notes'];

// FIX (aislamiento por sede, M3): estos registros no tienen branch_id
// propio, así que el acceso se valida contra la sede del estudiante
// referenciado. Lanza 404 (no 403) para no revelar que el registro existe
// en otra sede.
async function assertStudentBranchAccess(studentId, user, notFoundMessage) {
  const student = await studentsRepository.findById(studentId);
  assertBranchAccess(student, user, notFoundMessage);
  return student;
}

const GransifService = {
  async findAll(filters, user) {
    const { page = 1, pageSize = 20, search, studentId, academicYearId, status } = filters;
    // FIX (aislamiento por sede): restringe a los estudiantes de las sedes
    // del usuario.
    const queryFilters = scopeFiltersToUserBranches(
      { search, studentId, academicYearId, status },
      user
    );
    const [data, total] = await Promise.all([
      repository.findAll({ ...queryFilters, page, pageSize }),
      repository.count(queryFilters),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  },

  async findById(id, user) {
    const record = await repository.findById(id);
    if (!record) throw new AppError('Gransif record not found', 404);
    await assertStudentBranchAccess(record.student_id, user, 'Gransif record not found');
    return record;
  },

  async create(payload, user, req) {
    // FIX (aislamiento por sede): solo se pueden crear registros GRANSIF
    // para estudiantes de las sedes del usuario.
    if (!payload.student_id) throw new AppError('student_id is required', 400);
    await assertStudentBranchAccess(payload.student_id, user, 'Student not found');
    const code = await generateCode('GRN');
    const data = {
      ...pick(payload, ALLOWED_FIELDS),
      code,
      status: payload.status || 'PENDING',
      created_by: user.id,
      updated_by: user.id
    };
    const [id] = await repository.create(data);
    const record = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'CREATE',
      module: 'gransif',
      recordCode: code,
      after: record,
      req
    });
    
    return record;
  },

  async update(id, payload, user, req) {
    const existing = await repository.findById(id);
    if (!existing) throw new AppError('Gransif record not found', 404);
    await assertStudentBranchAccess(existing.student_id, user, 'Gransif record not found');
    // Si el update intenta reasignar el registro a otro estudiante, ese
    // estudiante también debe estar en las sedes del usuario.
    if (payload.student_id && Number(payload.student_id) !== Number(existing.student_id)) {
      await assertStudentBranchAccess(payload.student_id, user, 'Student not found');
    }
    
    const before = { ...existing };
    await repository.update(id, { ...pick(payload, ALLOWED_FIELDS), updated_by: user.id });
    const after = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'UPDATE',
      module: 'gransif',
      recordCode: existing.code,
      before,
      after,
      req
    });
    
    return after;
  },

  async softDelete(id, user, req) {
    const existing = await repository.findById(id);
    if (!existing) throw new AppError('Gransif record not found', 404);
    await assertStudentBranchAccess(existing.student_id, user, 'Gransif record not found');
    
    await repository.softDelete(id, user.id);
    
    await auditService.log({
      user,
      action: 'DELETE',
      module: 'gransif',
      recordCode: existing.code,
      before: existing,
      req
    });
    
    return true;
  },

  async activate(id, user, req) {
    const existing = await repository.findById(id);
    if (!existing) throw new AppError('Gransif record not found', 404);
    await assertStudentBranchAccess(existing.student_id, user, 'Gransif record not found');
    if (existing.status === 'ACTIVE') throw new AppError('Gransif already active', 409);
    
    // Would also validate that student is in final grade
    const before = { ...existing };
    await repository.activate(id, user.id);
    const after = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'ACTIVATE',
      module: 'gransif',
      recordCode: existing.code,
      before,
      after,
      req
    });
    
    return after;
  }
};

module.exports = GransifService;
