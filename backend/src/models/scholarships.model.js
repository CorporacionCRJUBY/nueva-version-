// FILE: backend/src/models/scholarships.model.js
const db = require('../config/database');
const { escapeLike } = require('../utils/escapeLike');

const TABLE = 'scholarships';
const FIELDS = [
  'id', 'code', 'student_id', 'scholarship_type', 'percentage',
  'amount', 'academic_year_id', 'start_date', 'end_date',
  'status', 'approval_date', 'rejection_reason', 'notes',
  'created_at', 'updated_at', 'deleted_at', 'deleted_by', 'created_by', 'updated_by'
];

// Shared by findAll() and count() so the row query and the count query for
// pagination never drift out of sync with each other.
function applyScholarshipFilters(query, { search, studentId, scholarshipType, status, academicYearId, branchIds }) {
  if (search) {
    query.where((builder) => {
      builder
        .where('scholarships.code', 'like', `%${escapeLike(search)}%`)
        .orWhere('students.first_name', 'like', `%${escapeLike(search)}%`)
        .orWhere('students.last_name', 'like', `%${escapeLike(search)}%`)
        .orWhere('scholarships.scholarship_type', 'like', `%${escapeLike(search)}%`);
    });
  }
  if (studentId) query.where('scholarships.student_id', studentId);
  if (scholarshipType) query.where('scholarships.scholarship_type', scholarshipType);
  if (status) query.where('scholarships.status', status);
  if (academicYearId) query.where('scholarships.academic_year_id', academicYearId);
    // FIX (auditoria hallazgo C1): registro pertenece a la sede de su estudiante.
  if (branchIds) query.whereIn('students.branch_id', branchIds);
  return query;
}

const Scholarships = {
  TABLE,
  FIELDS,

  findAll(filters = {}) {
    const { search, studentId, scholarshipType, status, academicYearId, branchIds, page, pageSize } = filters;
    let query = db(TABLE)
      .whereNull('scholarships.deleted_at')
      .leftJoin('students', 'students.id', 'scholarships.student_id')
      .leftJoin('academic_years', 'academic_years.id', 'scholarships.academic_year_id')
      .select(
        'scholarships.*',
        db.raw("CONCAT(students.first_name, ' ', students.last_name) as student_name"),
        'students.code as student_code',
        'academic_years.name as academic_year_name'
      );
    applyScholarshipFilters(query, { search, studentId, scholarshipType, status, academicYearId, branchIds });

    if (page && pageSize) {
      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);
    }

    return query.orderBy('scholarships.created_at', 'desc');
  },

  async count(filters = {}) {
    const { search, studentId, scholarshipType, status, academicYearId, branchIds } = filters;
    let query = db(TABLE)
      .whereNull('scholarships.deleted_at')
      .leftJoin('students', 'students.id', 'scholarships.student_id');
    applyScholarshipFilters(query, { search, studentId, scholarshipType, status, academicYearId, branchIds });
    const [{ total }] = await query.count({ total: 'scholarships.id' });
    return Number(total);
  },

  // FIX (auditoria hallazgo C1): join con students para exponer branch_id.
  findById(id) {
    return db(TABLE)
      .where({ 'scholarships.id': id, 'scholarships.deleted_at': null })
      .leftJoin('students', 'students.id', 'scholarships.student_id')
      .select('scholarships.*', 'students.branch_id as branch_id')
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
  },

  updateStatus(id, status, userId, reason = null) {
    const data = { status, updated_at: db.fn.now(), updated_by: userId };
    if (status === 'APPROVED') data.approval_date = db.fn.now();
    if (status === 'REJECTED' && reason) data.rejection_reason = reason;
    return db(TABLE).where({ id }).update(data);
  },

  // Records each status transition in scholarship_history (029_create_scholarship_history.js).
  // This table exists specifically to give admissions/finance an auditable
  // timeline of a scholarship's approval workflow (who changed it, when,
  // and why) that is separate from the generic cross-module audit log.
  addStatusHistory({ scholarshipId, fromStatus, toStatus, reason, changedBy }) {
    return db('scholarship_history').insert({
      scholarship_id: scholarshipId,
      from_status: fromStatus,
      to_status: toStatus,
      reason: reason || null,
      changed_by: changedBy,
      created_at: db.fn.now(),
    });
  },

  getStatusHistory(scholarshipId) {
    return db('scholarship_history')
      .leftJoin('users', 'users.id', 'scholarship_history.changed_by')
      .where('scholarship_history.scholarship_id', scholarshipId)
      .select(
        'scholarship_history.*',
        'users.full_name as changed_by_name'
      )
      .orderBy('scholarship_history.created_at', 'desc');
  }
};

module.exports = Scholarships;