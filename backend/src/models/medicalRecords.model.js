// FILE: backend/src/models/medicalRecords.model.js
const db = require('../config/database');
const { escapeLike } = require('../utils/escapeLike');

const TABLE = 'medical_records';
const FIELDS = [
  'id', 'code', 'student_id', 'medical_condition', 'allergies',
  'medications', 'emergency_contact_name', 'emergency_contact_phone',
  'health_insurance', 'insurance_number', 'notes', 'last_checkup_date',
  'created_at', 'updated_at', 'deleted_at', 'deleted_by', 'created_by', 'updated_by'
];

// Shared by findAll() and count() so the row query and the count query for
// pagination never drift out of sync with each other.
function applyMedicalRecordFilters(query, { search, studentId, medicalCondition, hasAllergy, branchIds }) {
  if (search) {
    query.where((builder) => {
      builder
        .where('medical_records.code', 'like', `%${escapeLike(search)}%`)
        .orWhere('students.first_name', 'like', `%${escapeLike(search)}%`)
        .orWhere('students.last_name', 'like', `%${escapeLike(search)}%`);
    });
  }
  if (studentId) query.where('medical_records.student_id', studentId);
  // FIX (auditoria hallazgo C1 - aislamiento por sede): un registro médico
  // no tiene branch_id propio, pertenece a la sede de su estudiante. Se
  // restringe vía el join con students que ya existía para el search.
  if (branchIds) query.whereIn('students.branch_id', branchIds);
  if (medicalCondition) query.where('medical_records.medical_condition', 'like', `%${escapeLike(medicalCondition)}%`);
  // hasAllergy arrives as the string 'true'/'false' from the query string, so
  // it must be compared explicitly rather than used as a truthy check (the
  // string 'false' is itself truthy in JS).
  if (hasAllergy === 'true' || hasAllergy === true) query.whereNotNull('medical_records.allergies').whereNot('medical_records.allergies', '');
  if (hasAllergy === 'false' || hasAllergy === false) {
    query.where((builder) => {
      builder.whereNull('medical_records.allergies').orWhere('medical_records.allergies', '');
    });
  }
  return query;
}

const MedicalRecords = {
  TABLE,
  FIELDS,

  findAll(filters = {}) {
    const { search, studentId, medicalCondition, hasAllergy, branchIds, page, pageSize } = filters;
    let query = db(TABLE)
      .whereNull('medical_records.deleted_at')
      .leftJoin('students', 'students.id', 'medical_records.student_id')
      .select(
        'medical_records.*',
        db.raw("CONCAT(students.first_name, ' ', students.last_name) as student_name")
      );
    applyMedicalRecordFilters(query, { search, studentId, medicalCondition, hasAllergy, branchIds });

    if (page && pageSize) {
      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);
    }

    return query.orderBy('medical_records.created_at', 'desc');
  },

  async count(filters = {}) {
    const { search, studentId, medicalCondition, hasAllergy, branchIds } = filters;
    let query = db(TABLE)
      .whereNull('medical_records.deleted_at')
      .leftJoin('students', 'students.id', 'medical_records.student_id');
    applyMedicalRecordFilters(query, { search, studentId, medicalCondition, hasAllergy, branchIds });
    const [{ total }] = await query.count({ total: 'medical_records.id' });
    return Number(total);
  },

  // FIX (auditoria hallazgo C1): se une con students para exponer
  // branch_id en el registro devuelto, de forma que el service pueda
  // validar la sede con el mismo helper assertBranchAccess() que ya usa
  // students.service.js, sin duplicar lógica de autorización.
  findById(id) {
    return db(TABLE)
      .where({ 'medical_records.id': id, 'medical_records.deleted_at': null })
      .leftJoin('students', 'students.id', 'medical_records.student_id')
      .select('medical_records.*', 'students.branch_id as branch_id')
      .first();
  },

  findByStudent(studentId) {
    return db(TABLE)
      .where({ student_id: studentId, deleted_at: null })
      .first();
  },

  create(data) {
    return db(TABLE).insert(data);
  },

  update(id, data) {
    return db(TABLE).where({ id }).update({ ...data, updated_at: db.fn.now() });
  },

  softDelete(id, userId) {
    return db(TABLE).where({ id }).update({
      deleted_at: db.fn.now(),
      deleted_by: userId
    });
  }
};

module.exports = MedicalRecords;