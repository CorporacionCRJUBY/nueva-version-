// FILE: backend/src/services/teachers.service.js
const { scopeFiltersToUserBranches, assertBranchAccess, assertBranchForCreate, assertBranchChangeAllowed } = require('../utils/branchScope');
const repository = require('../repositories/teachers.repository');
const { generateCode } = require('../utils/codeGenerator');
const auditService = require('./audit.service');
const { pick } = require('../utils/pick');

// FIX (auditoria hallazgo #5 - mass assignment): whitelist explícita de
// columnas reales de la tabla que el cliente puede escribir. Cualquier
// otro campo del body se ignora en vez de llegar crudo al INSERT/UPDATE.
const ALLOWED_FIELDS = ['user_id', 'first_name', 'last_name', 'email', 'phone', 'specialization', 'hire_date', 'branch_id', 'status', 'notes'];

const TeachersService = {
  async findAll(filters, user) {
    const { page = 1, pageSize = 20, firstName, lastName, email, branchId, status, search } = filters;
    // FIX (aislamiento por sede): restringe a las sedes del usuario.
    const queryFilters = scopeFiltersToUserBranches(
      { firstName, lastName, email, branchId, status, search },
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
    assertBranchAccess(record, user, 'Teacher not found');
    return record;
  },

  async getAssignments(id, filters, user) {
    const { academicYearId } = filters;
    const teacher = await repository.findById(id);
    assertBranchAccess(teacher, user, 'Teacher not found');
    return repository.getAssignments(id, academicYearId);
  },

  async create(payload, user, req) {
    // FIX (aislamiento por sede): valida que la sede del nuevo registro sea
    // una de las sedes asignadas al usuario.
    assertBranchForCreate(payload, user);
    const code = await generateCode('TEA');
    const data = {
      ...pick(payload, ALLOWED_FIELDS),
      code,
      status: payload.status || 'ACTIVE',
      hire_date: payload.hire_date || new Date(),
      created_by: user.id,
      updated_by: user.id
    };
    const [id] = await repository.create(data);
    const record = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'CREATE',
      module: 'teachers',
      recordCode: code,
      after: record,
      req
    });
    
    return record;
  },

  async update(id, payload, user, req) {
    const existing = await repository.findById(id);
    assertBranchAccess(existing, user, 'Teacher not found');
    // FIX (aislamiento por sede): impide mover al docente a una sede ajena.
    assertBranchChangeAllowed(payload, user);
    
    const before = { ...existing };
    await repository.update(id, { ...pick(payload, ALLOWED_FIELDS), updated_by: user.id });
    const after = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'UPDATE',
      module: 'teachers',
      recordCode: existing.code,
      before,
      after,
      req
    });
    
    return after;
  },

  async softDelete(id, user, req) {
    const existing = await repository.findById(id);
    assertBranchAccess(existing, user, 'Teacher not found');
    
    await repository.softDelete(id, user.id);
    
    await auditService.log({
      user,
      action: 'DELETE',
      module: 'teachers',
      recordCode: existing.code,
      before: existing,
      req
    });
    
    return true;
  }
};

module.exports = TeachersService;
