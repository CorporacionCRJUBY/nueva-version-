// FILE: backend/src/models/students.model.js
const db = require('../config/database');
const { escapeLike } = require('../utils/escapeLike');

const TABLE = 'students';

// Shared by findAll() and count() so the row query and the count query for
// pagination never drift out of sync with each other.
function applyStudentFilters(query, { search, firstName, lastName, email, grade, section, branchId, branchIds, academicYearId, status }) {
  if (search) {
    query.where((builder) => {
      builder
        .where('first_name', 'like', `%${escapeLike(search)}%`)
        .orWhere('last_name', 'like', `%${escapeLike(search)}%`)
        .orWhere('email', 'like', `%${escapeLike(search)}%`)
        .orWhere('code', 'like', `%${escapeLike(search)}%`);
    });
  }
  if (firstName) query.where('first_name', 'like', `%${escapeLike(firstName)}%`);
  if (lastName) query.where('last_name', 'like', `%${escapeLike(lastName)}%`);
  if (email) query.where('email', 'like', `%${escapeLike(email)}%`);
  if (grade) query.where('grade', grade);
  if (section) query.where('section', section);
  if (branchId) query.where('branch_id', branchId);
  // FIX (aislamiento por sede): permite restringir a un conjunto de sedes
  // (las del usuario autenticado) en vez de solo un branchId opcional que
  // el cliente podía omitir para ver todas las sedes.
  if (branchIds) query.whereIn('branch_id', branchIds);
  if (academicYearId) query.where('academic_year_id', academicYearId);
  if (status) query.where('status', status);
  return query;
}

const FIELDS = [
  'id', 'code', 'user_id', 'first_name', 'middle_name', 'last_name', 'second_last_name',
  'identification_type', 'identification_number', 'photo_url', 'email',
  'phone', 'address', 'date_of_birth', 'gender', 'grade', 'section',
  'branch_id', 'academic_year_id', 'enrollment_date', 'graduation_year',
  'status', 'notes', 'created_at', 'updated_at', 'deleted_at',
  'deleted_by', 'created_by', 'updated_by'
];

const Students = {
  TABLE,
  FIELDS,

  findAll(filters = {}) {
    const { page, pageSize } = filters;
    let query = db(TABLE).whereNull('deleted_at');
    applyStudentFilters(query, filters);

    if (page && pageSize) {
      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);
    }

    return query.orderBy('last_name', 'asc').orderBy('first_name', 'asc');
  },

  async count(filters = {}) {
    let query = db(TABLE).whereNull('deleted_at');
    applyStudentFilters(query, filters);
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

  findByCode(code) {
    return db(TABLE).where({ code, deleted_at: null }).first();
  },

  findFullRecord(id) {
    return db(TABLE).where({ id, deleted_at: null }).first();
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

  updateStatus(id, status, userId) {
    return db(TABLE).where({ id }).update({
      status,
      updated_at: db.fn.now(),
      updated_by: userId
    });
  }
};

module.exports = Students;