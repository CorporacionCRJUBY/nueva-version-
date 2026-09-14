// FILE: backend/src/services/assignments.service.js
const repository = require('../repositories/assignments.repository');
const { generateCode } = require('../utils/codeGenerator');
const auditService = require('./audit.service');
const { pick } = require('../utils/pick');
// FIX (auditoria hallazgo C1 - aislamiento por sede)
const { scopeFiltersToUserBranches, assertBranchAccess } = require('../utils/branchScope');

// FIX (auditoria hallazgo #5 - mass assignment): whitelist explícita de
// columnas reales de la tabla que el cliente puede escribir. Cualquier
// otro campo del body se ignora en vez de llegar crudo al INSERT/UPDATE.
const ALLOWED_FIELDS = ['teacher_id', 'subject_id', 'grade', 'section', 'branch_id', 'academic_year_id', 'schedule', 'status'];

const AssignmentsService = {
  async findAll(filters, user) {
    const { page = 1, pageSize = 20, search, teacherId, subjectId, grade, section, branchId, academicYearId, status } = filters;
    // FIX (C1): un usuario no-SUPER_ADMIN solo puede ver asignaciones de sus propias sedes.
    const queryFilters = scopeFiltersToUserBranches(
      { search, teacherId, subjectId, grade, section, branchId, academicYearId, status },
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
    assertBranchAccess(record, user, 'Assignment not found');
    return record;
  },

  async findByTeacher(teacherId, filters, user) {
    const { academicYearId } = filters;
    return repository.findByTeacher(teacherId, academicYearId);
  },

  async findBySection(sectionId, filters, user) {
    const { academicYearId } = filters;
    return repository.findBySection(sectionId, academicYearId);
  },

  async create(payload, user, req) {
    const code = await generateCode('ASN');
    const data = {
      ...pick(payload, ALLOWED_FIELDS),
      code,
      status: payload.status || 'ACTIVE',
      created_by: user.id,
      updated_by: user.id
    };
    const [id] = await repository.create(data);
    const record = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'CREATE',
      module: 'assignments',
      recordCode: code,
      after: record,
      req
    });
    
    return record;
  },

  async update(id, payload, user, req) {
    const existing = await repository.findById(id);
    assertBranchAccess(existing, user, 'Assignment not found');
    
    const before = { ...existing };
    await repository.update(id, { ...pick(payload, ALLOWED_FIELDS), updated_by: user.id });
    const after = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'UPDATE',
      module: 'assignments',
      recordCode: existing.code,
      before,
      after,
      req
    });
    
    return after;
  },

  async softDelete(id, user, req) {
    const existing = await repository.findById(id);
    assertBranchAccess(existing, user, 'Assignment not found');
    
    await repository.softDelete(id, user.id);
    
    await auditService.log({
      user,
      action: 'DELETE',
      module: 'assignments',
      recordCode: existing.code,
      before: existing,
      req
    });
    
    return true;
  }
};

module.exports = AssignmentsService;
