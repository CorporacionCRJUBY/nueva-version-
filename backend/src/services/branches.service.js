// FILE: backend/src/services/branches.service.js
const AppError = require('../utils/AppError');
const repository = require('../repositories/branches.repository');
const { generateCode } = require('../utils/codeGenerator');
const auditService = require('./audit.service');
const { pick } = require('../utils/pick');

// FIX (auditoria hallazgo #5 - mass assignment): whitelist explícita de
// columnas reales de la tabla que el cliente puede escribir. Cualquier
// otro campo del body se ignora en vez de llegar crudo al INSERT/UPDATE.
const ALLOWED_FIELDS = ['name', 'address', 'phone', 'email', 'status'];

const BranchesService = {
  async findAll(filters, user) {
    const { page = 1, pageSize = 20, status, search } = filters;
    const queryFilters = { status, search };
    const [data, total] = await Promise.all([
      repository.findAll({ ...queryFilters, page, pageSize }),
      repository.count(queryFilters),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  },

  async findById(id, user) {
    const record = await repository.findById(id);
    if (!record) throw new AppError('Branch not found', 404);
    return record;
  },

  async create(payload, user, req) {
    const code = await generateCode('BRC');
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
      module: 'branches',
      recordCode: code,
      after: record,
      req
    });
    
    return record;
  },

  async update(id, payload, user, req) {
    const existing = await repository.findById(id);
    if (!existing) throw new AppError('Branch not found', 404);
    
    const before = { ...existing };
    await repository.update(id, { ...pick(payload, ALLOWED_FIELDS), updated_by: user.id });
    const after = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'UPDATE',
      module: 'branches',
      recordCode: existing.code,
      before,
      after,
      req
    });
    
    return after;
  },

  async softDelete(id, user, req) {
    const existing = await repository.findById(id);
    if (!existing) throw new AppError('Branch not found', 404);
    
    await repository.softDelete(id, user.id);
    
    await auditService.log({
      user,
      action: 'DELETE',
      module: 'branches',
      recordCode: existing.code,
      before: existing,
      req
    });
    
    return true;
  }
};

module.exports = BranchesService;
