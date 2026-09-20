// FILE: backend/src/models/gransif.model.js
const db = require('../config/database');
const { escapeLike } = require('../utils/escapeLike');

const TABLE = 'gransif_records';
const FIELDS = [
  'id', 'code', 'student_id', 'academic_year_id', 'assessment_date',
  'score', 'status', 'notes', 'created_at', 'updated_at',
  'deleted_at', 'deleted_by', 'created_by', 'updated_by'
];

// Shared by findAll() and count() so the row query and the count query for
// pagination never drift out of sync with each other. (Same fix pattern as
// Graduation: the list was previously stuck at "0 results" because count()
// didn't exist at all.)
function applyGransifFilters(query, { search, studentId, academicYearId, status, branchIds }) {
  if (search) {
    query.where((builder) => {
      builder
        .where('gransif_records.code', 'like', `%${escapeLike(search)}%`)
        .orWhere('students.first_name', 'like', `%${escapeLike(search)}%`)
        .orWhere('students.last_name', 'like', `%${escapeLike(search)}%`);
    });
  }
  if (studentId) query.where('gransif_records.student_id', studentId);
  if (academicYearId) query.where('gransif_records.academic_year_id', academicYearId);
  if (status) query.where('gransif_records.status', status);
  // FIX (aislamiento por sede): estos registros no tienen branch_id propio;
  // la sede se hereda del estudiante asociado.
  if (branchIds) query.whereIn('students.branch_id', branchIds);
  return query;
}

const Gransif = {
  TABLE,
  FIELDS,

  findAll(filters = {}) {
    const { search, studentId, academicYearId, status, branchIds, page, pageSize } = filters;
    let query = db(TABLE)
      .whereNull('gransif_records.deleted_at')
      .leftJoin('students', 'students.id', 'gransif_records.student_id')
      .select(
        'gransif_records.*',
        db.raw("CONCAT(students.first_name, ' ', students.last_name) as student_name")
      );
    applyGransifFilters(query, { search, studentId, academicYearId, status, branchIds });

    if (page && pageSize) {
      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);
    }

    return query.orderBy('gransif_records.created_at', 'desc');
  },

  async count(filters = {}) {
    const { search, studentId, academicYearId, status, branchIds } = filters;
    let query = db(TABLE)
      .whereNull('gransif_records.deleted_at')
      .leftJoin('students', 'students.id', 'gransif_records.student_id');
    applyGransifFilters(query, { search, studentId, academicYearId, status, branchIds });
    const [{ total }] = await query.count({ total: 'gransif_records.id' });
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

  activate(id, userId) {
    return db(TABLE).where({ id }).update({
      status: 'ACTIVE',
      updated_at: db.fn.now(),
      updated_by: userId
    });
  }
};

module.exports = Gransif;
