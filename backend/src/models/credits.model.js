// FILE: backend/src/models/credits.model.js
const db = require('../config/database');
const { escapeLike } = require('../utils/escapeLike');

const TABLE = 'credits';
const FIELDS = [
  'id', 'code', 'student_id', 'academic_period_id', 'credit_type',
  'credits_earned', 'credits_required', 'status', 'notes',
  'created_at', 'updated_at', 'deleted_at', 'deleted_by', 'created_by', 'updated_by'
];

// Shared by findAll() and count() so the row query and the count query for
// pagination never drift out of sync with each other.
function applyCreditFilters(query, { search, studentId, academicPeriodId, creditType, status, branchIds }) {
  if (search) {
    query.where((builder) => {
      builder
        .where('credits.code', 'like', `%${escapeLike(search)}%`)
        .orWhere('students.first_name', 'like', `%${escapeLike(search)}%`)
        .orWhere('students.last_name', 'like', `%${escapeLike(search)}%`);
    });
  }
  if (studentId) query.where('credits.student_id', studentId);
  if (academicPeriodId) query.where('credits.academic_period_id', academicPeriodId);
  if (creditType) query.where('credits.credit_type', creditType);
  if (status) query.where('credits.status', status);
    // FIX (auditoria hallazgo C1): registro pertenece a la sede de su estudiante.
  if (branchIds) query.whereIn('students.branch_id', branchIds);
  return query;
}

const Credits = {
  TABLE,
  FIELDS,

  findAll(filters = {}) {
    const { search, studentId, academicPeriodId, creditType, status, branchIds, page, pageSize } = filters;
    let query = db(TABLE)
      .whereNull('credits.deleted_at')
      .leftJoin('students', 'students.id', 'credits.student_id')
      .leftJoin('academic_periods', 'academic_periods.id', 'credits.academic_period_id')
      .select(
        'credits.*',
        db.raw("CONCAT(students.first_name, ' ', students.last_name) as student_name"),
        'academic_periods.name as academic_period_name'
      );
    applyCreditFilters(query, { search, studentId, academicPeriodId, creditType, status, branchIds });

    if (page && pageSize) {
      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);
    }

    return query.orderBy('credits.created_at', 'desc');
  },

  async count(filters = {}) {
    const { search, studentId, academicPeriodId, creditType, status, branchIds } = filters;
    let query = db(TABLE)
      .whereNull('credits.deleted_at')
      .leftJoin('students', 'students.id', 'credits.student_id');
    applyCreditFilters(query, { search, studentId, academicPeriodId, creditType, status, branchIds });
    const [{ total }] = await query.count({ total: 'credits.id' });
    return Number(total);
  },

  // FIX (auditoria hallazgo C1): join con students para exponer branch_id.
  findById(id) {
    return db(TABLE)
      .where({ 'credits.id': id, 'credits.deleted_at': null })
      .leftJoin('students', 'students.id', 'credits.student_id')
      .select('credits.*', 'students.branch_id as branch_id')
      .first();
  },

  findByStudent(studentId) {
    return db(TABLE)
      .where({ student_id: studentId, deleted_at: null })
      .orderBy('created_at', 'desc');
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

module.exports = Credits;