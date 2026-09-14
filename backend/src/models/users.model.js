// FILE: backend/src/models/users.model.js
const db = require('../config/database');
const { escapeLike } = require('../utils/escapeLike');
const { encrypt: encryptField, decrypt: decryptField, isEncrypted } = require('../utils/cryptoBox');

const TABLE = 'users';
const FIELDS = [
  'id', 'code', 'email', 'password', 'full_name', 'phone', 'role_id',
  'branch_id', 'status', 'last_login', 'login_attempts', 'locked_until',
  'twofa_enabled', 'twofa_enabled_at',
  'created_at', 'updated_at', 'deleted_at', 'deleted_by',
  'created_by', 'updated_by'
];

// Shared by findAll() and count() so the row query and the count query for
// pagination never drift out of sync with each other.
function applyUsersFilters(query, { search, email, fullName, roleId, branchId, branchIds, status }) {
  if (search) {
    query.where((builder) => {
      builder
        .where('users.full_name', 'like', `%${escapeLike(search)}%`)
        .orWhere('users.email', 'like', `%${escapeLike(search)}%`)
        .orWhere('users.code', 'like', `%${escapeLike(search)}%`);
    });
  }
  if (email) query.where('users.email', 'like', `%${escapeLike(email)}%`);
  if (fullName) query.where('users.full_name', 'like', `%${escapeLike(fullName)}%`);
  if (roleId) query.where('users.role_id', roleId);
  if (branchId) query.where('users.branch_id', branchId);
  // FIX (aislamiento por sede): restringe a las sedes del usuario.
  if (branchIds) query.whereIn('users.branch_id', branchIds);
  if (status) query.where('users.status', status);
  return query;
}

const Users = {
  TABLE,
  FIELDS,

  findAll(filters = {}) {
    const { page, pageSize } = filters;
    let query = db(TABLE)
      .whereNull('users.deleted_at')
      .leftJoin('roles', 'roles.id', 'users.role_id')
      .leftJoin('branches', 'branches.id', 'users.branch_id')
      .select(
        'users.*',
        'roles.name as role_name',
        'branches.name as branch_name'
      );
    applyUsersFilters(query, filters);

    if (page && pageSize) {
      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);
    }

    return query.orderBy('users.full_name', 'asc');
  },

  async count(filters = {}) {
    let query = db(TABLE).whereNull('users.deleted_at');
    applyUsersFilters(query, filters);
    const [{ total }] = await query.count({ total: 'users.id' });
    return Number(total);
  },

  findById(id) {
    return db(TABLE)
      .where({ 'users.id': id, 'users.deleted_at': null })
      .leftJoin('roles', 'roles.id', 'users.role_id')
      .leftJoin('branches', 'branches.id', 'users.branch_id')
      .select(
        'users.*',
        'roles.name as role_name',
        'branches.name as branch_name'
      )
      .first();
  },

  findByEmail(email) {
    return db(TABLE).where({ email, deleted_at: null }).first();
  },

  findByRole(roleId) {
    return db(TABLE)
      .where({ role_id: roleId, deleted_at: null })
      .orderBy('full_name', 'asc');
  },

  findByBranch(branchId) {
    return db(TABLE)
      .where({ branch_id: branchId, deleted_at: null })
      .orderBy('full_name', 'asc');
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

  updatePassword(id, hashedPassword) {
    return db(TABLE).where({ id }).update({
      password: hashedPassword,
      // SEGURIDAD (medio M6): marca cuándo cambió la contraseña; el refresh
      // token emitido antes de este instante se rechaza en auth.service.
      password_changed_at: db.fn.now(),
      updated_at: db.fn.now()
    });
  },

  updateLastLogin(id) {
    return db(TABLE).where({ id }).update({
      last_login: db.fn.now()
    });
  },

  incrementLoginAttempts(id) {
    return db(TABLE).where({ id }).increment('login_attempts', 1);
  },

  // Bloqueo de cuenta: login_attempts existía pero nunca bloqueaba nada.
  // Tras MAX_LOGIN_ATTEMPTS fallos consecutivos, fija locked_until
  // LOCKOUT_MINUTES minutos en el futuro; auth.service.js rechaza el login
  // mientras locked_until siga en el futuro, y este mismo método libera el
  // bloqueo automáticamente una vez expira (no requiere intervención manual).
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_MINUTES: 15,

  async registerFailedLogin(id) {
    const user = await db(TABLE).where({ id }).first();
    const attempts = (user?.login_attempts || 0) + 1;
    const update = { login_attempts: attempts, updated_at: db.fn.now() };
    if (attempts >= this.MAX_LOGIN_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + this.LOCKOUT_MINUTES * 60 * 1000);
      update.locked_until = lockedUntil;
      // FIX (segunda pasada, BAJO #8): si no se reinicia el contador al
      // fijar el bloqueo, tras expirar locked_until el siguiente fallo
      // vuelve a bloquear de inmediato (6 >= 5), contradiciendo la promesa
      // de liberación automática. Con esto la cuenta vuelve a tener 5
      // intentos frescos cuando el bloqueo expira.
      update.login_attempts = 0;
    }
    await db(TABLE).where({ id }).update(update);
    return update.locked_until || null;
  },

  isLocked(user) {
    return Boolean(user.locked_until && new Date(user.locked_until) > new Date());
  },

  resetLoginAttempts(id) {
    return db(TABLE).where({ id }).update({
      login_attempts: 0,
      locked_until: null,
      updated_at: db.fn.now()
    });
  },

  assignRoles(userId, roleIds) {
    const records = roleIds.map(roleId => ({
      user_id: userId,
      role_id: roleId
    }));
    return db('user_roles').insert(records);
  },

  clearRoles(userId) {
    return db('user_roles').where('user_id', userId).del();
  },

  // Bug fix (critical): login's getRoles()/getPermissions() below only ever
  // read from `user_roles` — they never fall back to the legacy `role_id`
  // column on `users`. But create()/update() only ever wrote `role_id` and
  // never touched `user_roles` (only the "Assign Roles" screen did). So any
  // user made through the normal "New User" form logged in with an empty
  // roles/permissions array — able to authenticate, but blocked by RBAC on
  // every single screen, with no error explaining why. This keeps
  // `user_roles` in sync with `role_id` without touching any additional
  // roles an admin assigned separately via "Assign Roles".
  async ensureRole(userId, roleId) {
    if (!roleId) return;
    const existing = await db('user_roles').where({ user_id: userId, role_id: roleId }).first();
    if (!existing) {
      await db('user_roles').insert({ user_id: userId, role_id: roleId });
    }
  },

  // FIX (bug de sincronización users.role_id <-> user_roles): cambiar el
  // desplegable "Rol" de un usuario (columna `role_id`) llamaba a
  // ensureRole(), que solo AGREGA el rol nuevo a `user_roles` sin quitar
  // el anterior. Como getPermissions()/getRoles() calculan la sesión a
  // partir de TODAS las filas de `user_roles`, el usuario terminaba con
  // la UNIÓN de los permisos del rol viejo y el nuevo — bajarle el rol a
  // alguien no le revocaba nada.
  //
  // Este método reemplaza específicamente la fila ligada al `role_id`
  // anterior por la del nuevo, sin tocar ningún otro rol que se le haya
  // asignado a mano desde la pantalla "Asignar roles" (por eso solo se
  // borra `oldRoleId`, no todas las filas del usuario como haría
  // clearRoles()).
  async replacePrimaryRole(userId, oldRoleId, newRoleId) {
    if (!newRoleId || Number(oldRoleId) === Number(newRoleId)) {
      return this.ensureRole(userId, newRoleId);
    }
    await db.transaction(async (trx) => {
      if (oldRoleId) {
        await trx('user_roles').where({ user_id: userId, role_id: oldRoleId }).del();
      }
      const existing = await trx('user_roles').where({ user_id: userId, role_id: newRoleId }).first();
      if (!existing) {
        await trx('user_roles').insert({ user_id: userId, role_id: newRoleId });
      }
    });
  },

  getRoles(userId) {
    return db('user_roles')
      .where('user_id', userId)
      .join('roles', 'user_roles.role_id', 'roles.id')
      .select('roles.*');
  },

  getPermissions(userId) {
    return db('user_roles')
      .where('user_roles.user_id', userId)
      .join('role_permissions', 'user_roles.role_id', 'role_permissions.role_id')
      .join('permissions', 'role_permissions.permission_id', 'permissions.id')
      .whereNull('permissions.deleted_at')
      .select('permissions.*')
      .distinct();
  },

  // --- 2FA (auditoria hallazgo bajo #2) ---------------------------------

  // Trae las columnas de 2FA, que se dejaron fuera de FIELDS/findById para
  // no exponer accidentalmente secretos/hashes en cualquier respuesta que
  // reuse esas consultas (perfil, listados de admin, etc). Solo se piden
  // explícitamente donde el flujo de 2FA las necesita. Los secretos se
  // descifran aquí (AES-256-GCM, utils/cryptoBox.js) para que el resto del
  // sistema trabaje siempre con el secreto en claro solo en memoria.
  async findTwoFactorState(id) {
    const state = await db(TABLE)
      .where({ id })
      .select('id', 'email', 'twofa_secret', 'twofa_pending_secret', 'twofa_enabled', 'twofa_backup_codes')
      .first();
    if (!state) return state;
    return {
      ...state,
      twofa_secret_encrypted: isEncrypted(state.twofa_secret),
      twofa_secret: decryptField(state.twofa_secret),
      twofa_pending_secret: decryptField(state.twofa_pending_secret),
    };
  },

  setPendingTwoFactorSecret(id, secret) {
    return db(TABLE).where({ id }).update({
      twofa_pending_secret: encryptField(secret),
      updated_at: db.fn.now(),
    });
  },

  // Confirma el setup: promueve el secreto pendiente a activo, habilita
  // 2FA y guarda los hashes de los códigos de respaldo (nunca en claro).
  enableTwoFactor(id, secret, hashedBackupCodes) {
    return db(TABLE).where({ id }).update({
      twofa_secret: encryptField(secret),
      twofa_pending_secret: null,
      twofa_enabled: true,
      twofa_backup_codes: JSON.stringify(hashedBackupCodes),
      twofa_enabled_at: db.fn.now(),
      updated_at: db.fn.now(),
    });
  },

  // Migración lazy: recifra un secreto legacy almacenado en texto plano
  // sin tocar el resto del estado de 2FA (ver auth.service.js).
  upgradeTwoFactorSecret(id, encryptedSecret) {
    return db(TABLE).where({ id }).update({
      twofa_secret: encryptedSecret,
      updated_at: db.fn.now(),
    });
  },

  disableTwoFactor(id) {
    return db(TABLE).where({ id }).update({
      twofa_secret: null,
      twofa_pending_secret: null,
      twofa_enabled: false,
      twofa_backup_codes: null,
      twofa_enabled_at: null,
      updated_at: db.fn.now(),
    });
  },

  replaceBackupCodes(id, hashedBackupCodes) {
    return db(TABLE).where({ id }).update({
      twofa_backup_codes: JSON.stringify(hashedBackupCodes),
      updated_at: db.fn.now(),
    });
  }
};

module.exports = Users;