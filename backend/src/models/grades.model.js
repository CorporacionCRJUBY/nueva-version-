// FILE: backend/src/models/grades.model.js
const db = require('../config/database');
const { escapeLike } = require('../utils/escapeLike');

const TABLE = 'grade_records';
const FIELDS = [
  'id', 'code', 'student_id', 'subject_id', 'assignment_id',
  'academic_period_id', 'grade_value', 'grade_letter', 'weight',
  'status', 'edit_deadline', 'created_at', 'updated_at',
  'deleted_at', 'deleted_by', 'created_by', 'updated_by'
];

// Shared by findAll() and count() so the row query and the count query for
// pagination never drift out of sync with each other.
function applyGradeFilters(query, { search, studentId, subjectId, assignmentId, academicPeriodId, status, branchIds }) {
  if (search) {
    query.where((builder) => {
      builder
        .where('grade_records.code', 'like', `%${escapeLike(search)}%`)
        .orWhere('grade_records.grade_letter', 'like', `%${escapeLike(search)}%`);
    });
  }
  if (studentId) query.where('grade_records.student_id', studentId);
  if (subjectId) query.where('grade_records.subject_id', subjectId);
  if (assignmentId) query.where('grade_records.assignment_id', assignmentId);
  if (academicPeriodId) query.where('grade_records.academic_period_id', academicPeriodId);
  if (status) query.where('grade_records.status', status);
  // FIX (auditoria hallazgo C1): la calificación pertenece a la sede de su estudiante.
  if (branchIds) query.whereIn('students.branch_id', branchIds);
  return query;
}

const Grades = {
  TABLE,
  FIELDS,

  findAll(filters = {}) {
    const { search, studentId, subjectId, assignmentId, academicPeriodId, status, branchIds, page, pageSize } = filters;
    let query = db(TABLE)
      .whereNull('grade_records.deleted_at')
      .leftJoin('students', 'students.id', 'grade_records.student_id')
      .leftJoin('subjects', 'subjects.id', 'grade_records.subject_id')
      .select(
        'grade_records.*',
        db.raw("CONCAT(students.first_name, ' ', students.last_name) as student_name"),
        'subjects.name as subject_name'
      );
    applyGradeFilters(query, { search, studentId, subjectId, assignmentId, academicPeriodId, status, branchIds });

    if (page && pageSize) {
      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);
    }

    return query.orderBy('grade_records.created_at', 'desc');
  },

  async count(filters = {}) {
    const { search, studentId, subjectId, assignmentId, academicPeriodId, status, branchIds } = filters;
    let query = db(TABLE).whereNull('grade_records.deleted_at');
    if (branchIds) query.leftJoin('students', 'students.id', 'grade_records.student_id');
    applyGradeFilters(query, { search, studentId, subjectId, assignmentId, academicPeriodId, status, branchIds });
    const [{ total }] = await query.count({ total: 'grade_records.id' });
    return Number(total);
  },

  // FIX (auditoria hallazgo C1): join con students para exponer branch_id.
  findById(id) {
    return db(TABLE)
      .where({ 'grade_records.id': id, 'grade_records.deleted_at': null })
      .leftJoin('students', 'students.id', 'grade_records.student_id')
      .select('grade_records.*', 'students.branch_id as branch_id')
      .first();
  },

  findByStudent(studentId) {
    return db(TABLE)
      .where({ student_id: studentId, deleted_at: null })
      .orderBy('created_at', 'desc');
  },

  findByAssignment(assignmentId) {
    return db(TABLE)
      .where({ assignment_id: assignmentId, deleted_at: null })
      .orderBy('student_id');
  },

  findByStudentAndPeriod(studentId, academicPeriodId) {
    return db(TABLE)
      .where({
        student_id: studentId,
        academic_period_id: academicPeriodId,
        deleted_at: null
      })
      .orderBy('subject_id');
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

  lock(id, userId) {
    return db(TABLE).where({ id }).update({
      status: 'LOCKED',
      updated_at: db.fn.now(),
      updated_by: userId
    });
  },

  unlock(id, userId) {
    return db(TABLE).where({ id }).update({
      status: 'UNLOCKED',
      updated_at: db.fn.now(),
      updated_by: userId
    });
  },

  bulkCreate(records) {
    return db(TABLE).insert(records);
  },

  bulkUpdate(records) {
    const queries = records.map(record =>
      db(TABLE).where({ id: record.id }).update({ ...record, updated_at: db.fn.now() })
    );
    return Promise.all(queries);
  }
};

module.exports = Grades;