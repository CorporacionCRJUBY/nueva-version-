// FILE: backend/src/services/academicYears.service.js
const AppError = require('../utils/AppError');
const repository = require('../repositories/academicYears.repository');
const { generateCode } = require('../utils/codeGenerator');
const auditService = require('./audit.service');
const { pick } = require('../utils/pick');

// FIX (auditoria hallazgo #5 - mass assignment): whitelist explícita de
// columnas reales de la tabla que el cliente puede escribir. Cualquier
// otro campo del body se ignora en vez de llegar crudo al INSERT/UPDATE.
const ALLOWED_FIELDS = ['name', 'start_date', 'end_date', 'status', 'is_active'];

const AcademicYearsService = {
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
    if (!record) throw new AppError('Academic year not found', 404);
    return record;
  },

  async create(payload, user, req) {
    const code = await generateCode('AYR');
    // BUG REAL CORREGIDO (invariante de negocio): antes se marcaba el ano
    // nuevo como ACTIVE por defecto mientras la desactivacion de los demas
    // solo ocurria si el cliente enviaba `is_active: true` de forma
    // explicita. Asi, crear un ano sin decirlo dejaba DOS o mas anos
    // vigentes a la vez, lo que rompe cualquier calculo de "ano actual"
    // (matriculas, periodos abiertos, promociones). Ahora la regla es
    // unica: activar un ano desactiva siempre los demas, y un ano creado
    // sin pedir activacion queda INACTIVE.
    const willBeActive = payload.is_active === true || payload.status === 'ACTIVE';
    const data = {
      ...pick(payload, ALLOWED_FIELDS),
      code,
      status: willBeActive ? 'ACTIVE' : 'INACTIVE',
      created_by: user.id,
      updated_by: user.id
    };
    if (willBeActive) {
      await repository.deactivateAllExcept(null);
    }
    const [id] = await repository.create(data);
    const record = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'CREATE',
      module: 'academic-years',
      recordCode: code,
      after: record,
      req
    });
    
    return record;
  },

  async update(id, payload, user, req) {
    const existing = await repository.findById(id);
    if (!existing) throw new AppError('Academic year not found', 404);
    
    const before = { ...existing };
    // Only one academic year can be the "current" one at a time — turning
    // this one on must turn every other one off.
    if (payload.is_active) {
      await repository.deactivateAllExcept(id);
    }
    await repository.update(id, { ...pick(payload, ALLOWED_FIELDS), updated_by: user.id });
    const after = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'UPDATE',
      module: 'academic-years',
      recordCode: existing.code,
      before,
      after,
      req
    });
    
    return after;
  },

  async softDelete(id, user, req) {
    const existing = await repository.findById(id);
    if (!existing) throw new AppError('Academic year not found', 404);
    
    await repository.softDelete(id, user.id);
    
    await auditService.log({
      user,
      action: 'DELETE',
      module: 'academic-years',
      recordCode: existing.code,
      before: existing,
      req
    });
    
    return true;
  },

  /**
   * Marca este ano academico como el vigente.
   *
   * BUG REAL CORREGIDO: el frontend de gestion de anos academicos esperaba
   * `POST /academic-years/:id/activate`, pero la ruta y el metodo no existian
   * en el backend (404). Ademas de crear el endpoint, se centraliza aqui la
   * regla de negocio que ya aplica update(): solo un ano puede ser el vigente
   * a la vez, asi que activar uno desactiva los demas en la misma operacion.
   */
  async activate(id, user, req) {
    const existing = await repository.findById(id);
    if (!existing) throw new AppError('Academic year not found', 404);
    if (existing.status === 'ACTIVE') {
      throw new AppError('This academic year is already active', 409);
    }

    const before = { ...existing };
    await repository.deactivateAllExcept(id);
    await repository.update(id, { status: 'ACTIVE', updated_by: user.id });
    const after = await repository.findById(id);

    await auditService.log({
      user,
      action: 'ACTIVATE',
      module: 'academic-years',
      recordCode: existing.code,
      before,
      after,
      req
    });

    return after;
  }
};

module.exports = AcademicYearsService;
