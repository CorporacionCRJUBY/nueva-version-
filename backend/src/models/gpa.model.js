// FILE: backend/src/models/gpa.model.js
const db = require('../config/database');
const { escapeLike } = require('../utils/escapeLike');

const TABLE = 'gpa_records';
const FIELDS = [
  'id', 'code', 'student_id', 'academic_period_id', 'academic_year_id',
  'gpa_value', 'cumulative_gpa', 'credit_hours', 'status', 'calculation_date',
  'created_at', 'updated_at', 'deleted_at', 'deleted_by', 'created_by', 'updated_by'
];

// Shared by findAll() and count() so the row query and the count query for
// pagination never drift out of sync with each other.
function applyGpaFilters(query, { search, studentId, academicPeriodId, academicYearId, status, branchIds }) {
  if (search) {
    query.where((builder) => {
      builder
        .where('gpa_records.code', 'like', `%${escapeLike(search)}%`)
        .orWhere('students.first_name', 'like', `%${escapeLike(search)}%`)
        .orWhere('students.last_name', 'like', `%${escapeLike(search)}%`);
    });
  }
  if (studentId) query.where('gpa_records.student_id', studentId);
  if (academicPeriodId) query.where('gpa_records.academic_period_id', academicPeriodId);
  if (academicYearId) query.where('gpa_records.academic_year_id', academicYearId);
  if (status) query.where('gpa_records.status', status);
    // FIX (auditoria hallazgo C1): registro pertenece a la sede de su estudiante.
  if (branchIds) query.whereIn('students.branch_id', branchIds);
  return query;
}

const GPA = {
  TABLE,
  FIELDS,

  findAll(filters = {}) {
    const { search, studentId, academicPeriodId, academicYearId, status, branchIds, page, pageSize } = filters;
    let query = db(TABLE)
      .whereNull('gpa_records.deleted_at')
      .leftJoin('students', 'students.id', 'gpa_records.student_id')
      .leftJoin('academic_periods', 'academic_periods.id', 'gpa_records.academic_period_id')
      .select(
        'gpa_records.*',
        db.raw("CONCAT(students.first_name, ' ', students.last_name) as student_name"),
        'academic_periods.name as academic_period_name'
      );
    applyGpaFilters(query, { search, studentId, academicPeriodId, academicYearId, status, branchIds });

    if (page && pageSize) {
      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);
    }

    return query.orderBy('gpa_records.academic_period_id', 'desc');
  },

  async count(filters = {}) {
    const { search, studentId, academicPeriodId, academicYearId, status, branchIds } = filters;
    let query = db(TABLE)
      .whereNull('gpa_records.deleted_at')
      .leftJoin('students', 'students.id', 'gpa_records.student_id');
    applyGpaFilters(query, { search, studentId, academicPeriodId, academicYearId, status, branchIds });
    const [{ total }] = await query.count({ total: 'gpa_records.id' });
    return Number(total);
  },

  // FIX (auditoria hallazgo C1): join con students para exponer branch_id.
  findById(id) {
    return db(TABLE)
      .where({ 'gpa_records.id': id, 'gpa_records.deleted_at': null })
      .leftJoin('students', 'students.id', 'gpa_records.student_id')
      .select('gpa_records.*', 'students.branch_id as branch_id')
      .first();
  },

  findByStudent(studentId) {
    return db(TABLE)
      .where({ student_id: studentId, deleted_at: null })
      .orderBy('academic_period_id', 'desc');
  },

  findByStudentAndPeriod(studentId, academicPeriodId) {
    return db(TABLE)
      .where({
        student_id: studentId,
        academic_period_id: academicPeriodId,
        deleted_at: null
      })
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
  },

  deleteByStudent(studentId) {
    return db(TABLE).where({ student_id: studentId }).del();
  }
};

module.exports = GPA;