// FILE: backend/src/models/roles.model.js
const db = require('../config/database');
const { escapeLike } = require('../utils/escapeLike');

const TABLE = 'roles';
const FIELDS = [
  'id', 'code', 'name', 'description', 'status',
  'created_at', 'updated_at', 'deleted_at', 'deleted_by', 'created_by', 'updated_by'
];

// Shared by findAll() and count() so the row query and the count query for
// pagination never drift out of sync with each other.
function applyRolesFilters(query, { search, name, status }) {
  if (search) {
    query.where((builder) => {
      builder
        .where('code', 'like', `%${escapeLike(search)}%`)
        .orWhere('name', 'like', `%${escapeLike(search)}%`)
        .orWhere('description', 'like', `%${escapeLike(search)}%`);
    });
  }
  if (name) query.where('name', 'like', `%${escapeLike(name)}%`);
  if (status) query.where('status', status);
  return query;
}

const Roles = {
  TABLE,
  FIELDS,

  findAll(filters = {}) {
    const { search, name, status, page, pageSize } = filters;
    let query = db(TABLE).whereNull('deleted_at');
    applyRolesFilters(query, { search, name, status });

    if (page && pageSize) {
      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);
    }

    return query.orderBy('name', 'asc');
  },

  async count(filters = {}) {
    const { search, name, status } = filters;
    let query = db(TABLE).whereNull('deleted_at');
    applyRolesFilters(query, { search, name, status });
    const [{ total }] = await query.count({ total: 'id' });
    return Number(total);
  },

  findById(id) {
    return db(TABLE).where({ id, deleted_at: null }).first();
  },

  findByName(name) {
    return db(TABLE).where({ name, deleted_at: null }).first();
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

  assignPermissions(roleId, permissionIds) {
    const records = permissionIds.map(permissionId => ({
      role_id: roleId,
      permission_id: permissionId
    }));
    return db('role_permissions').insert(records);
  },

  clearPermissions(roleId) {
    return db('role_permissions').where('role_id', roleId).del();
  },

  getPermissions(roleId) {
    return db('role_permissions')
      .where('role_id', roleId)
      .select('permission_id');
  }
};

module.exports = Roles;