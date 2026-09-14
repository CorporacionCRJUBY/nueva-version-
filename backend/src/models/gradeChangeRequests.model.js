// FILE: backend/src/models/gradeChangeRequests.model.js
const db = require('../config/database');

const TABLE = 'grade_change_requests';
const FIELDS = [
  'id', 'code', 'grade_record_id', 'student_id', 'requested_by',
  'current_grade', 'requested_grade', 'reason', 'status',
  'reviewed_by', 'reviewed_at', 'review_notes',
  'created_at', 'updated_at', 'deleted_at', 'deleted_by'
];

const GradeChangeRequests = {
  TABLE,
  FIELDS,

  findAll(filters = {}) {
    const { studentId, gradeRecordId, status, dateFrom, dateTo, branchIds, page, pageSize } = filters;
    let query = db(TABLE).whereNull('grade_change_requests.deleted_at');

    if (studentId) query = query.where('student_id', studentId);
    if (gradeRecordId) query = query.where('grade_record_id', gradeRecordId);
    if (status) query = query.where('status', status);
    if (dateFrom) query = query.where('created_at', '>=', dateFrom);
    if (dateTo) query = query.where('created_at', '<=', dateTo);
    // FIX (auditoria hallazgo C1): la solicitud pertenece a la sede de su estudiante.
    if (branchIds) {
      query = query
        .leftJoin('students', 'students.id', 'grade_change_requests.student_id')
        .whereIn('students.branch_id', branchIds)
        .select('grade_change_requests.*');
    }

    if (page && pageSize) {
      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);
    }

    return query.orderBy('created_at', 'desc');
  },

  async count(filters = {}) {
    const { studentId, gradeRecordId, status, dateFrom, dateTo, branchIds } = filters;
    let query = db(TABLE).whereNull('grade_change_requests.deleted_at');

    if (studentId) query = query.where('student_id', studentId);
    if (gradeRecordId) query = query.where('grade_record_id', gradeRecordId);
    if (status) query = query.where('status', status);
    if (dateFrom) query = query.where('created_at', '>=', dateFrom);
    if (dateTo) query = query.where('created_at', '<=', dateTo);
    if (branchIds) {
      query = query
        .leftJoin('students', 'students.id', 'grade_change_requests.student_id')
        .whereIn('students.branch_id', branchIds);
    }

    const [{ total }] = await query.count({ total: 'grade_change_requests.id' });
    return Number(total);
  },

  // FIX (auditoria hallazgo C1): join con students para exponer branch_id.
  findById(id) {
    return db(TABLE)
      .where({ 'grade_change_requests.id': id, 'grade_change_requests.deleted_at': null })
      .leftJoin('students', 'students.id', 'grade_change_requests.student_id')
      .select('grade_change_requests.*', 'students.branch_id as branch_id')
      .first();
  },

  findByStudent(studentId) {
    return db(TABLE)
      .where({ student_id: studentId, deleted_at: null })
      .orderBy('created_at', 'desc');
  },

  findByGradeRecord(gradeRecordId) {
    return db(TABLE)
      .where({ grade_record_id: gradeRecordId, deleted_at: null })
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

  approve(id, reviewerId, notes = null) {
    return db(TABLE).where({ id }).update({
      status: 'APPROVED',
      reviewed_by: reviewerId,
      reviewed_at: db.fn.now(),
      review_notes: notes,
      updated_at: db.fn.now()
    });
  },

  reject(id, reviewerId, notes = null) {
    return db(TABLE).where({ id }).update({
      status: 'REJECTED',
      reviewed_by: reviewerId,
      reviewed_at: db.fn.now(),
      review_notes: notes,
      updated_at: db.fn.now()
    });
  }
};

module.exports = GradeChangeRequests;