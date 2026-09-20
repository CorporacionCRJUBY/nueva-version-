// FILE: backend/src/services/medicalRecords.service.js
const AppError = require('../utils/AppError');
const repository = require('../repositories/medicalRecords.repository');
const studentsRepository = require('../repositories/students.repository');
const { generateCode } = require('../utils/codeGenerator');
const auditService = require('./audit.service');
const { pick } = require('../utils/pick');
// FIX (auditoria hallazgo C1 - aislamiento por sede): mismo helper que ya
// usan students/teachers/users.service.js.
const { scopeFiltersToUserBranches, assertBranchAccess } = require('../utils/branchScope');

// FIX (auditoria hallazgo #5 - mass assignment): whitelist explícita de
// columnas reales de la tabla que el cliente puede escribir. Cualquier
// otro campo del body se ignora en vez de llegar crudo al INSERT/UPDATE.
const ALLOWED_FIELDS = ['student_id', 'medical_condition', 'allergies', 'medications', 'emergency_contact_name', 'emergency_contact_phone', 'health_insurance', 'insurance_number', 'notes', 'last_checkup_date'];

const MedicalRecordsService = {
  async findAll(filters, user) {
    const { page = 1, pageSize = 20, search, studentId, medicalCondition, hasAllergy } = filters;
    // FIX (C1): un usuario no-SUPER_ADMIN solo puede listar expedientes
    // médicos de estudiantes de sus propias sedes.
    const queryFilters = scopeFiltersToUserBranches(
      { search, studentId, medicalCondition, hasAllergy },
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
    // FIX (C1): 404 si el estudiante dueño del expediente no pertenece a
    // una sede del usuario (en vez de devolver el registro sin más).
    assertBranchAccess(record, user, 'Medical record not found');
    return record;
  },

  async create(payload, user, req) {
    // FIX (aislamiento por sede, M3): solo se pueden crear expedientes para
    // estudiantes de las sedes del usuario.
    if (!payload.student_id) throw new AppError('student_id is required', 400);
    const student = await studentsRepository.findById(payload.student_id);
    assertBranchAccess(student, user, 'Student not found');
    const code = await generateCode('MED');
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
      module: 'medical-records',
      recordCode: code,
      after: record,
      req
    });
    
    return record;
  },

  async update(id, payload, user, req) {
    const existing = await repository.findById(id);
    assertBranchAccess(existing, user, 'Medical record not found');
    
    const before = { ...existing };
    await repository.update(id, { ...pick(payload, ALLOWED_FIELDS), updated_by: user.id });
    const after = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'UPDATE',
      module: 'medical-records',
      recordCode: existing.code,
      before,
      after,
      req
    });
    
    return after;
  },

  async softDelete(id, user, req) {
    const existing = await repository.findById(id);
    assertBranchAccess(existing, user, 'Medical record not found');
    
    await repository.softDelete(id, user.id);
    
    await auditService.log({
      user,
      action: 'DELETE',
      module: 'medical-records',
      recordCode: existing.code,
      before: existing,
      req
    });
    
    return true;
  }
};

module.exports = MedicalRecordsService;
