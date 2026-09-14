// FILE: backend/src/models/branches.model.js
const db = require('../config/database');
const { escapeLike } = require('../utils/escapeLike');

const TABLE = 'branches';
const FIELDS = [
  'id', 'code', 'name', 'address', 'phone', 'email', 'status',
  'created_at', 'updated_at', 'deleted_at', 'deleted_by', 'created_by', 'updated_by'
];

const Branches = {
  TABLE,
  FIELDS,

  findAll(filters = {}) {
    const { status, search, page, pageSize } = filters;
    let query = db(TABLE).whereNull('deleted_at');

    if (status) query = query.where('status', status);
    if (search) {
      query = query.where((builder) => {
        builder
          .where('name', 'like', `%${escapeLike(search)}%`)
          .orWhere('code', 'like', `%${escapeLike(search)}%`)
          .orWhere('address', 'like', `%${escapeLike(search)}%`)
          .orWhere('email', 'like', `%${escapeLike(search)}%`);
      });
    }

    if (page && pageSize) {
      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);
    }

    return query.orderBy('name', 'asc');
  },

  // Same filters as findAll() so the row query and the count query for
  // pagination never drift out of sync with each other.
  async count(filters = {}) {
    const { status, search } = filters;
    let query = db(TABLE).whereNull('deleted_at');

    if (status) query = query.where('status', status);
    if (search) {
      query = query.where((builder) => {
        builder
          .where('name', 'like', `%${escapeLike(search)}%`)
          .orWhere('code', 'like', `%${escapeLike(search)}%`)
          .orWhere('address', 'like', `%${escapeLike(search)}%`)
          .orWhere('email', 'like', `%${escapeLike(search)}%`);
      });
    }

    const [{ total }] = await query.count({ total: '*' });
    return Number(total);
  },

  findById(id) {
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
  }
};

module.exports = Branches;