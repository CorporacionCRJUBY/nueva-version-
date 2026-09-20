// FILE: backend/src/models/teachers.model.js
const db = require('../config/database');
const { escapeLike } = require('../utils/escapeLike');

const TABLE = 'teachers';
const FIELDS = [
  'id', 'code', 'user_id', 'first_name', 'last_name', 'email',
  'phone', 'specialization', 'hire_date', 'branch_id', 'status',
  'notes', 'created_at', 'updated_at', 'deleted_at', 'deleted_by',
  'created_by', 'updated_by'
];

const Teachers = {
  TABLE,
  FIELDS,

  findAll(filters = {}) {
    const { firstName, lastName, email, branchId, branchIds, status, search, page, pageSize } = filters;
    let query = db(TABLE).whereNull('deleted_at');

    if (firstName) query = query.where('first_name', 'like', `%${escapeLike(firstName)}%`);
    if (lastName) query = query.where('last_name', 'like', `%${escapeLike(lastName)}%`);
    if (email) query = query.where('email', 'like', `%${escapeLike(email)}%`);
    if (branchId) query = query.where('branch_id', branchId);
    // FIX (aislamiento por sede): restringe a las sedes del usuario.
    if (branchIds) query = query.whereIn('branch_id', branchIds);
    if (status) query = query.where('status', status);
    if (search) {
      query = query.where((builder) => {
        builder
          .where('first_name', 'like', `%${escapeLike(search)}%`)
          .orWhere('last_name', 'like', `%${escapeLike(search)}%`)
          .orWhere('email', 'like', `%${escapeLike(search)}%`)
          .orWhere('code', 'like', `%${escapeLike(search)}%`)
          .orWhere('specialization', 'like', `%${escapeLike(search)}%`);
      });
    }

    if (page && pageSize) {
      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);
    }

    return query.orderBy('last_name', 'asc').orderBy('first_name', 'asc');
  },

  // Mirrors findAll()'s filters so the row query and the count query for
  // pagination never drift out of sync with each other.
  async count(filters = {}) {
    const { firstName, lastName, email, branchId, branchIds, status, search } = filters;
    let query = db(TABLE).whereNull('deleted_at');

    if (firstName) query = query.where('first_name', 'like', `%${escapeLike(firstName)}%`);
    if (lastName) query = query.where('last_name', 'like', `%${escapeLike(lastName)}%`);
    if (email) query = query.where('email', 'like', `%${escapeLike(email)}%`);
    if (branchId) query = query.where('branch_id', branchId);
    if (branchIds) query = query.whereIn('branch_id', branchIds);
    if (status) query = query.where('status', status);
    if (search) {
      query = query.where((builder) => {
        builder
          .where('first_name', 'like', `%${escapeLike(search)}%`)
          .orWhere('last_name', 'like', `%${escapeLike(search)}%`)
          .orWhere('email', 'like', `%${escapeLike(search)}%`)
          .orWhere('code', 'like', `%${escapeLike(search)}%`)
          .orWhere('specialization', 'like', `%${escapeLike(search)}%`);
      });
    }

    const [{ total }] = await query.count({ total: '*' });
    return Number(total);
  },

  findById(id) {
    return db(TABLE).where({ id, deleted_at: null }).first();
  },

  findByUser(userId) {
    return db(TABLE).where({ user_id: userId, deleted_at: null }).first();
  },

  findByEmail(email) {
    return db(TABLE).where({ email, deleted_at: null }).first();
  },

  findByBranch(branchId) {
    return db(TABLE)
      .where({ branch_id: branchId, deleted_at: null })
      .orderBy('last_name', 'asc');
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

  getAssignments(teacherId, academicYearId = null) {
    let query = db('academic_assignments')
      .where({ 'academic_assignments.teacher_id': teacherId, 'academic_assignments.deleted_at': null })
      .join('subjects', 'academic_assignments.subject_id', 'subjects.id')
      .join('academic_years', 'academic_assignments.academic_year_id', 'academic_years.id');

    if (academicYearId) query = query.where('academic_assignments.academic_year_id', academicYearId);

    return query.select(
      'academic_assignments.*',
      'subjects.name as subject_name',
      'academic_years.name as academic_year_name'
    );
  }
};

module.exports = Teachers;