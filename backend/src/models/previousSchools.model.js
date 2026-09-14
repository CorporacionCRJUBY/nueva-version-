// FILE: backend/src/models/previousSchools.model.js
const db = require('../config/database');
const { escapeLike } = require('../utils/escapeLike');

const TABLE = 'previous_schools';
const FIELDS = [
  'id', 'code', 'student_id', 'school_name', 'address',
  'phone', 'grade_level', 'year_attended', 'transcript_received',
  'notes', 'created_at', 'updated_at', 'deleted_at', 'deleted_by',
  'created_by', 'updated_by'
];

// Shared by findAll() and count() so the row query and the count query for
// pagination never drift out of sync with each other.
function applyPreviousSchoolFilters(query, { search, studentId, schoolName, branchIds }) {
  if (search) {
    query.where((builder) => {
      builder
        .where('previous_schools.code', 'like', `%${escapeLike(search)}%`)
        .orWhere('previous_schools.school_name', 'like', `%${escapeLike(search)}%`)
        .orWhere('students.first_name', 'like', `%${escapeLike(search)}%`)
        .orWhere('students.last_name', 'like', `%${escapeLike(search)}%`);
    });
  }
  if (studentId) query.where('previous_schools.student_id', studentId);
  if (schoolName) query.where('previous_schools.school_name', 'like', `%${escapeLike(schoolName)}%`);
    // FIX (auditoria hallazgo C1): registro pertenece a la sede de su estudiante.
  if (branchIds) query.whereIn('students.branch_id', branchIds);
  return query;
}

const PreviousSchools = {
  TABLE,
  FIELDS,

  findAll(filters = {}) {
    const { search, studentId, schoolName, branchIds, page, pageSize } = filters;
    let query = db(TABLE)
      .whereNull('previous_schools.deleted_at')
      .leftJoin('students', 'students.id', 'previous_schools.student_id')
      .select(
        'previous_schools.*',
        db.raw("CONCAT(students.first_name, ' ', students.last_name) as student_name")
      );
    applyPreviousSchoolFilters(query, { search, studentId, schoolName, branchIds });

    if (page && pageSize) {
      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);
    }

    return query.orderBy('previous_schools.year_attended', 'desc');
  },

  async count(filters = {}) {
    const { search, studentId, schoolName, branchIds } = filters;
    let query = db(TABLE)
      .whereNull('previous_schools.deleted_at')
      .leftJoin('students', 'students.id', 'previous_schools.student_id');
    applyPreviousSchoolFilters(query, { search, studentId, schoolName, branchIds });
    const [{ total }] = await query.count({ total: 'previous_schools.id' });
    return Number(total);
  },

  // FIX (auditoria hallazgo C1): join con students para exponer branch_id.
  findById(id) {
    return db(TABLE)
      .where({ 'previous_schools.id': id, 'previous_schools.deleted_at': null })
      .leftJoin('students', 'students.id', 'previous_schools.student_id')
      .select('previous_schools.*', 'students.branch_id as branch_id')
      .first();
  },

  findByStudent(studentId) {
    return db(TABLE)
      .where({ student_id: studentId, deleted_at: null })
      .orderBy('year_attended', 'desc');
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

module.exports = PreviousSchools;