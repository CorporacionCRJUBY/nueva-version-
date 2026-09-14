// FILE: backend/src/models/graduation.model.js
const db = require('../config/database');
const { escapeLike } = require('../utils/escapeLike');

const TABLE = 'graduation_records';
const FIELDS = [
  'id', 'code', 'student_id', 'academic_year_id', 'graduation_date',
  'status', 'requirements_met', 'validation_notes', 'certificate_number',
  'created_at', 'updated_at', 'deleted_at', 'deleted_by', 'created_by', 'updated_by'
];

// Shared by findAll() and count() so the row query and the count query for
// pagination never drift out of sync with each other.
function applyGraduationFilters(query, { search, studentId, academicYearId, status, branchIds }) {
  if (search) {
    query.where((builder) => {
      builder
        .where('graduation_records.code', 'like', `%${escapeLike(search)}%`)
        .orWhere('students.first_name', 'like', `%${escapeLike(search)}%`)
        .orWhere('students.last_name', 'like', `%${escapeLike(search)}%`);
    });
  }
  if (studentId) query.where('graduation_records.student_id', studentId);
  if (academicYearId) query.where('graduation_records.academic_year_id', academicYearId);
  if (status) query.where('graduation_records.status', status);
  // FIX (aislamiento por sede): estos registros no tienen branch_id propio;
  // la sede se hereda del estudiante asociado.
  if (branchIds) query.whereIn('students.branch_id', branchIds);
  return query;
}

const Graduation = {
  TABLE,
  FIELDS,

  findAll(filters = {}) {
    const { search, studentId, academicYearId, status, branchIds, page, pageSize } = filters;
    let query = db(TABLE)
      .whereNull('graduation_records.deleted_at')
      .leftJoin('students', 'students.id', 'graduation_records.student_id')
      .select(
        'graduation_records.*',
        db.raw("CONCAT(students.first_name, ' ', students.last_name) as student_name")
      );
    applyGraduationFilters(query, { search, studentId, academicYearId, status, branchIds });

    if (page && pageSize) {
      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);
    }

    return query.orderBy('graduation_records.created_at', 'desc');
  },

  async count(filters = {}) {
    const { search, studentId, academicYearId, status, branchIds } = filters;
    let query = db(TABLE)
      .whereNull('graduation_records.deleted_at')
      .leftJoin('students', 'students.id', 'graduation_records.student_id');
    applyGraduationFilters(query, { search, studentId, academicYearId, status, branchIds });
    const [{ total }] = await query.count({ total: 'graduation_records.id' });
    return Number(total);
  },

  findById(id) {
    return db(TABLE).where({ id, deleted_at: null }).first();
  },

  findByStudent(studentId) {
    return db(TABLE)
      .where({ student_id: studentId, deleted_at: null })
      .orderBy('created_at', 'desc');
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
  },

  validate(id, userId, validationNotes = null, requirementsMet = true) {
    return db(TABLE).where({ id }).update({
      status: 'VALIDATED',
      requirements_met: requirementsMet,
      validation_notes: validationNotes,
      updated_at: db.fn.now(),
      updated_by: userId
    });
  }
};

module.exports = Graduation;