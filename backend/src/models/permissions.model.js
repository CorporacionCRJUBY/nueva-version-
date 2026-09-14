// FILE: backend/src/models/permissions.model.js
const db = require('../config/database');
const { escapeLike } = require('../utils/escapeLike');

const TABLE = 'permissions';
const FIELDS = [
  'id', 'code', 'module', 'action', 'description',
  'created_at', 'updated_at', 'deleted_at', 'deleted_by'
];

// Shared by findAll() and count() so the row query and the count query for
// pagination never drift out of sync with each other.
function applyPermissionsFilters(query, { search, module, action }) {
  if (search) {
    query.where((builder) => {
      builder
        .where('code', 'like', `%${escapeLike(search)}%`)
        .orWhere('module', 'like', `%${escapeLike(search)}%`)
        .orWhere('action', 'like', `%${escapeLike(search)}%`)
        .orWhere('description', 'like', `%${escapeLike(search)}%`);
    });
  }
  if (module) query.where('module', module);
  if (action) query.where('action', action);
  return query;
}

const Permissions = {
  TABLE,
  FIELDS,

  findAll(filters = {}) {
    const { search, module, action, page, pageSize } = filters;
    let query = db(TABLE).whereNull('deleted_at');
    applyPermissionsFilters(query, { search, module, action });

    if (page && pageSize) {
      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);
    }

    return query.orderBy('module', 'asc').orderBy('action', 'asc');
  },

  async count(filters = {}) {
    const { search, module, action } = filters;
    let query = db(TABLE).whereNull('deleted_at');
    applyPermissionsFilters(query, { search, module, action });
    const [{ total }] = await query.count({ total: 'id' });
    return Number(total);
  },

  findById(id) {
    return db(TABLE).where({ id, deleted_at: null }).first();
  },

  findByModule(module) {
    return db(TABLE)
      .where({ module, deleted_at: null })
      .orderBy('action', 'asc');
  },

  // FIX (auditoria hallazgo C2 - escalamiento de privilegios): usado por
  // roles.service.assignPermissions para inspeccionar, ANTES de guardar,
  // si alguno de los permisos que se van a asignar es un comodín
  // ("*", "modulo.*" o un módulo/acción literal "*"). Sin esto, cualquier
  // usuario con roles.edit podía otorgar acceso total a un rol simplemente
  // enviando el/los permissionId correctos, sin que el backend supiera qué
  // significaban esos ids hasta que ya era tarde.
  findByIds(ids) {
    if (!ids || ids.length === 0) return Promise.resolve([]);
    return db(TABLE).whereIn('id', ids).whereNull('deleted_at');
  },

  findByRole(roleId) {
    return db(TABLE)
      .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
      .where({ 'role_permissions.role_id': roleId, 'permissions.deleted_at': null })
      .select('permissions.*');
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

module.exports = Permissions;