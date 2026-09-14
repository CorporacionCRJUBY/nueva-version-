// FILE: backend/src/services/academicPeriods.service.js
const AppError = require('../utils/AppError');
const repository = require('../repositories/academicPeriods.repository');
const { generateCode } = require('../utils/codeGenerator');
const auditService = require('./audit.service');
const { pick } = require('../utils/pick');

// FIX (auditoria hallazgo #5 - mass assignment): whitelist explícita de
// columnas reales de la tabla que el cliente puede escribir. Cualquier
// otro campo del body se ignora en vez de llegar crudo al INSERT/UPDATE.
const ALLOWED_FIELDS = ['academic_year_id', 'name', 'start_date', 'end_date', 'status', 'is_active', 'grading_config'];

const AcademicPeriodsService = {
  async findAll(filters, user) {
    const { page = 1, pageSize = 20, academicYearId, status, search } = filters;
    const queryFilters = { academicYearId, status, search };
    const [data, total] = await Promise.all([
      repository.findAll({ ...queryFilters, page, pageSize }),
      repository.count(queryFilters),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  },

  async findById(id, user) {
    const record = await repository.findById(id);
    if (!record) throw new AppError('Academic period not found', 404);
    return record;
  },

  async create(payload, user, req) {
    const code = await generateCode('APR');
    const data = {
      ...pick(payload, ALLOWED_FIELDS),
      code,
      status: payload.status || 'OPEN',
      created_by: user.id,
      updated_by: user.id
    };
    const [id] = await repository.create(data);
    const record = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'CREATE',
      module: 'academic-periods',
      recordCode: code,
      after: record,
      req
    });
    
    return record;
  },

  async update(id, payload, user, req) {
    const existing = await repository.findById(id);
    if (!existing) throw new AppError('Academic period not found', 404);
    if (existing.status === 'LOCKED') throw new AppError('Cannot update a locked period', 409);
    
    const before = { ...existing };
    await repository.update(id, { ...pick(payload, ALLOWED_FIELDS), updated_by: user.id });
    const after = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'UPDATE',
      module: 'academic-periods',
      recordCode: existing.code,
      before,
      after,
      req
    });
    
    return after;
  },

  async softDelete(id, user, req) {
    const existing = await repository.findById(id);
    if (!existing) throw new AppError('Academic period not found', 404);
    if (existing.status === 'LOCKED') throw new AppError('Cannot delete a locked period', 409);
    
    await repository.softDelete(id, user.id);
    
    await auditService.log({
      user,
      action: 'DELETE',
      module: 'academic-periods',
      recordCode: existing.code,
      before: existing,
      req
    });
    
    return true;
  },

  async close(id, user, req) {
    const existing = await repository.findById(id);
    if (!existing) throw new AppError('Academic period not found', 404);
    if (existing.status === 'CLOSED') throw new AppError('Period already closed', 409);
    if (existing.status === 'LOCKED') throw new AppError('Cannot close a locked period', 409);
    
    const before = { ...existing };
    await repository.close(id, user.id);
    const after = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'CLOSE',
      module: 'academic-periods',
      recordCode: existing.code,
      before,
      after,
      req
    });
    
    return after;
  },

  async lock(id, user, req) {
    const existing = await repository.findById(id);
    if (!existing) throw new AppError('Academic period not found', 404);
    if (existing.status === 'LOCKED') throw new AppError('Period already locked', 409);
    
    const before = { ...existing };
    await repository.lock(id, user.id);
    const after = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'LOCK',
      module: 'academic-periods',
      recordCode: existing.code,
      before,
      after,
      req
    });
    
    return after;
  }
};

module.exports = AcademicPeriodsService;
