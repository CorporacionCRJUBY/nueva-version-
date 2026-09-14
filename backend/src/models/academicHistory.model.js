// FILE: backend/src/models/academicHistory.model.js
const db = require('../config/database');
const { escapeLike } = require('../utils/escapeLike');

const TABLE = 'academic_history';
const FIELDS = [
  'id', 'code', 'student_id', 'academic_period_id', 'academic_year_id',
  'subject_id', 'grade_value', 'grade_letter', 'status', 'notes', 'created_at', 'updated_at',
  'deleted_at', 'deleted_by', 'created_by', 'updated_by'
];

// Shared by findAll() and count() so the row query and the count query for
// pagination never drift out of sync with each other. (Same systemic bug as
// Branches/Teachers/Subjects/Graduation/Gransif: this model had no count()
// and no JOINs at all, so the list always showed "0 results" and raw IDs
// like "Student 3" / "Subject 5" instead of real names.)
function applyAcademicHistoryFilters(query, { search, studentId, academicYearId, periodId, status, branchIds }) {
  if (search) {
    query.where((builder) => {
      builder
        .where('academic_history.code', 'like', `%${escapeLike(search)}%`)
        .orWhere('students.first_name', 'like', `%${escapeLike(search)}%`)
        .orWhere('students.last_name', 'like', `%${escapeLike(search)}%`)
        .orWhere('subjects.name', 'like', `%${escapeLike(search)}%`);
    });
  }
  if (studentId) query.where('academic_history.student_id', studentId);
  if (academicYearId) query.where('academic_history.academic_year_id', academicYearId);
  if (periodId) query.where('academic_history.academic_period_id', periodId);
  if (status) query.where('academic_history.status', status);
    // FIX (auditoria hallazgo C1): registro pertenece a la sede de su estudiante.
  if (branchIds) query.whereIn('students.branch_id', branchIds);
  return query;
}

const AcademicHistory = {
  TABLE,
  FIELDS,

  findAll(filters = {}) {
    const { search, studentId, academicYearId, periodId, status, branchIds, page, pageSize } = filters;
    let query = db(TABLE)
      .whereNull('academic_history.deleted_at')
      .leftJoin('students', 'students.id', 'academic_history.student_id')
      .leftJoin('subjects', 'subjects.id', 'academic_history.subject_id')
      .leftJoin('academic_periods', 'academic_periods.id', 'academic_history.academic_period_id')
      .select(
        'academic_history.*',
        db.raw("CONCAT(students.first_name, ' ', students.last_name) as student_name"),
        'subjects.name as subject_name',
        'academic_periods.name as period_name'
      );
    applyAcademicHistoryFilters(query, { search, studentId, academicYearId, periodId, status, branchIds });

    if (page && pageSize) {
      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);
    }

    return query.orderBy('academic_history.created_at', 'desc');
  },

  async count(filters = {}) {
    const { search, studentId, academicYearId, periodId, status, branchIds } = filters;
    let query = db(TABLE)
      .whereNull('academic_history.deleted_at')
      .leftJoin('students', 'students.id', 'academic_history.student_id')
      .leftJoin('subjects', 'subjects.id', 'academic_history.subject_id');
    applyAcademicHistoryFilters(query, { search, studentId, academicYearId, periodId, status, branchIds });
    const [{ total }] = await query.count({ total: 'academic_history.id' });
    return Number(total);
  },

  // FIX (auditoria hallazgo C1): join con students para exponer branch_id.
  findById(id) {
    return db(TABLE)
      .where({ 'academic_history.id': id, 'academic_history.deleted_at': null })
      .leftJoin('students', 'students.id', 'academic_history.student_id')
      .select('academic_history.*', 'students.branch_id as branch_id')
      .first();
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
  }
};

module.exports = AcademicHistory;
