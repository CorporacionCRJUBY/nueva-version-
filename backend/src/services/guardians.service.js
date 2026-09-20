// FILE: backend/src/services/guardians.service.js
const AppError = require('../utils/AppError');
const repository = require('../repositories/guardians.repository');
const studentsRepository = require('../repositories/students.repository');
const { generateCode } = require('../utils/codeGenerator');
const auditService = require('./audit.service');
const { pick } = require('../utils/pick');
// FIX (auditoria hallazgo C1 - aislamiento por sede)
const { scopeFiltersToUserBranches, assertBranchAccess } = require('../utils/branchScope');

// FIX (auditoria hallazgo #5 - mass assignment): whitelist explícita de
// columnas reales de la tabla que el cliente puede escribir. Cualquier
// otro campo del body se ignora en vez de llegar crudo al INSERT/UPDATE.
const ALLOWED_FIELDS = ['student_id', 'first_name', 'last_name', 'relationship', 'identification', 'phone', 'secondary_phone', 'email', 'address', 'is_emergency_contact', 'is_primary', 'authorized_pickup', 'status', 'notes'];

const GuardiansService = {
  async findAll(filters, user) {
    const { page = 1, pageSize = 20, search, studentId, relationship } = filters;
    // FIX (C1): solo tutores vinculados a estudiantes de las sedes del usuario.
    const queryFilters = scopeFiltersToUserBranches({ search, studentId, relationship }, user);
    const [data, total] = await Promise.all([
      repository.findAll({ ...queryFilters, page, pageSize }),
      repository.count(queryFilters),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  },

  async findById(id, user) {
    // FIX (C1): se valida la sede vía el/los estudiante(s) vinculados antes
    // de devolver el registro (incluye teléfono, dirección, autorización de
    // recogida, etc. de un adulto vinculado a un menor de otra sede).
    const branchCheck = await repository.findByIdWithBranch(id);
    assertBranchAccess(branchCheck, user, 'Guardian not found');
    const record = await repository.findByIdWithStudent(id);
    if (!record) throw new AppError('Guardian not found', 404);
    return record;
  },

  async findByStudent(studentId, user) {
    // FIX (C1): valida que el estudiante padre pertenezca a una sede del
    // usuario antes de listar a sus tutores.
    const student = await studentsRepository.findById(studentId);
    assertBranchAccess(student, user, 'Student not found');
    return repository.findByStudent(studentId);
  },

  async create(payload, user, req) {
    // FIX (C1): valida que el estudiante al que se vincula el tutor
    // pertenezca a una sede del usuario antes de crear el registro —
    // create() era la única operación del módulo sin este chequeo.
    if (payload.student_id) {
      const student = await studentsRepository.findById(payload.student_id);
      assertBranchAccess(student, user, 'Student not found');
    }
    const code = await generateCode('GUA');
    const data = {
      ...pick(payload, ALLOWED_FIELDS),
      code,
      created_by: user.id,
      updated_by: user.id
    };
    const [id] = await repository.create(data);
    const record = await repository.findByIdWithStudent(id);
    
    await auditService.log({
      user,
      action: 'CREATE',
      module: 'guardians',
      recordCode: code,
      after: record,
      req
    });
    
    return record;
  },

  async update(id, payload, user, req) {
    // FIX (C1): valida la sede antes de permitir editar los datos del tutor.
    const branchCheck = await repository.findByIdWithBranch(id);
    assertBranchAccess(branchCheck, user, 'Guardian not found');
    const existing = await repository.findById(id);
    if (!existing) throw new AppError('Guardian not found', 404);
    
    const before = { ...existing };
    await repository.update(id, { ...pick(payload, ALLOWED_FIELDS), updated_by: user.id });
    const after = await repository.findByIdWithStudent(id);
    
    await auditService.log({
      user,
      action: 'UPDATE',
      module: 'guardians',
      recordCode: existing.code,
      before,
      after,
      req
    });
    
    return after;
  },

  async softDelete(id, user, req) {
    // FIX (C1): valida la sede antes de permitir eliminar al tutor.
    const branchCheck = await repository.findByIdWithBranch(id);
    assertBranchAccess(branchCheck, user, 'Guardian not found');
    const existing = await repository.findById(id);
    if (!existing) throw new AppError('Guardian not found', 404);
    
    await repository.softDelete(id, user.id);
    
    await auditService.log({
      user,
      action: 'DELETE',
      module: 'guardians',
      recordCode: existing.code,
      before: existing,
      req
    });
    
    return true;
  }
};

module.exports = GuardiansService;
