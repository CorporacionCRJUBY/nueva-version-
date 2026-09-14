// FILE: backend/src/models/subjects.model.js
const db = require('../config/database');
const { escapeLike } = require('../utils/escapeLike');

const TABLE = 'subjects';
const FIELDS = [
  'id', 'code', 'name', 'description', 'grade', 'branch_id',
  'credits', 'hours_per_week', 'status', 'created_at', 'updated_at',
  'deleted_at', 'deleted_by', 'created_by', 'updated_by'
];

const Subjects = {
  TABLE,
  FIELDS,

  findAll(filters = {}) {
    const { name, code, grade, branchId, branchIds, status, search, page, pageSize } = filters;
    let query = db(TABLE).whereNull('deleted_at');

    if (name) query = query.where('name', 'like', `%${escapeLike(name)}%`);
    if (code) query = query.where('code', 'like', `%${escapeLike(code)}%`);
    if (grade) query = query.where('grade', grade);
    if (branchId) query = query.where('branch_id', branchId);
    // FIX (aislamiento por sede): permite restringir a un conjunto de sedes
    // (las del usuario autenticado) en vez de solo un branchId opcional que
    // el cliente podía omitir para ver todas las sedes.
    if (branchIds) query = query.whereIn('branch_id', branchIds);
    if (status) query = query.where('status', status);
    if (search) {
      query = query.where((builder) => {
        builder
          .where('name', 'like', `%${escapeLike(search)}%`)
          .orWhere('code', 'like', `%${escapeLike(search)}%`)
          .orWhere('description', 'like', `%${escapeLike(search)}%`);
      });
    }

    if (page && pageSize) {
      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);
    }

    return query.orderBy('name', 'asc');
  },

  // Mirrors findAll()'s filters so the row query and the count query for
  // pagination never drift out of sync with each other.
  async count(filters = {}) {
    const { name, code, grade, branchId, branchIds, status, search } = filters;
    let query = db(TABLE).whereNull('deleted_at');

    if (name) query = query.where('name', 'like', `%${escapeLike(name)}%`);
    if (code) query = query.where('code', 'like', `%${escapeLike(code)}%`);
    if (grade) query = query.where('grade', grade);
    if (branchId) query = query.where('branch_id', branchId);
    if (branchIds) query = query.whereIn('branch_id', branchIds);
    if (status) query = query.where('status', status);
    if (search) {
      query = query.where((builder) => {
        builder
          .where('name', 'like', `%${escapeLike(search)}%`)
          .orWhere('code', 'like', `%${escapeLike(search)}%`)
          .orWhere('description', 'like', `%${escapeLike(search)}%`);
      });
    }

    const [{ total }] = await query.count({ total: '*' });
    return Number(total);
  },

  findById(id) {
    return db(TABLE).where({ id, deleted_at: null }).first();
  },

  findByGrade(grade) {
    return db(TABLE)
      .where({ grade, deleted_at: null })
      .orderBy('name', 'asc');
  },

  findByBranch(branchId) {
    return db(TABLE)
      .where({ branch_id: branchId, deleted_at: null })
      .orderBy('name', 'asc');
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

module.exports = Subjects;