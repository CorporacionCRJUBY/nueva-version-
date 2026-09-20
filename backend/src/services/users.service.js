// FILE: backend/src/services/users.service.js
const AppError = require('../utils/AppError');
const bcrypt = require ('bcryptjs');
const { scopeFiltersToUserBranches, assertBranchAccess, assertBranchForCreate, assertBranchChangeAllowed } = require('../utils/branchScope');
const repository = require('../repositories/users.repository');
const rolesRepository = require('../repositories/roles.repository');
const { generateCode } = require('../utils/codeGenerator');
const auditService = require('./audit.service');
const { pick } = require('../utils/pick');

// FIX (auditoria hallazgo #5 - mass assignment): whitelist explícita de
// columnas reales de la tabla que el cliente puede escribir. Cualquier
// otro campo del body se ignora en vez de llegar crudo al INSERT/UPDATE.
// NOTA DE SEGURIDAD ADICIONAL: aunque son columnas reales de `users`,
// last_login/login_attempts/locked_until se excluyen a propósito del
// whitelist: son estado interno que solo debe modificar la lógica de auth
// (login, lockout), nunca un cliente vía PUT /users/:id — si no, cualquier
// ADMIN (o un usuario editando su propio perfil) podría desbloquear una
// cuenta bloqueada por fuerza bruta con solo mandar locked_until: null.
const ALLOWED_FIELDS = ['email', 'password', 'full_name', 'phone', 'role_id', 'branch_id', 'status'];

// Campos que el propio usuario puede editar desde su perfil (Profile.jsx).
const PROFILE_FIELDS = ['full_name', 'phone', 'email'];

// The password hash must never leave the backend: it has no use on the
// client and, worse, UserFormPage spreads the full record it receives back
// into its form state. If the hash were included here, saving an edit
// without touching the password field would resubmit the *hash* as the new
// plaintext password, which update() below would then re-hash on top of
// itself — silently corrupting the user's real password on every edit.
//
// FIX (segunda pasada de auditoría, ALTO #2): findById/findAll seleccionan
// `users.*`, así que también salían en la respuesta el ciphertext de los
// secretos TOTP, los hashes de los códigos de respaldo y el estado interno
// de bloqueo. Nada de eso tiene uso legítimo en el cliente.
function sanitize(record) {
  if (!record) return record;
  const {
    password,
    twofa_secret,
    twofa_pending_secret,
    twofa_backup_codes,
    twofa_enabled_at,
    login_attempts,
    locked_until,
    password_changed_at,
    ...safe
  } = record;
  return safe;
}

const UsersService = {
  async findAll(filters, user) {
    const { page = 1, pageSize = 20, search, email, fullName, roleId, branchId, status } = filters;
    // FIX (aislamiento por sede): restringe a las sedes del usuario.
    const queryFilters = scopeFiltersToUserBranches(
      { search, email, fullName, roleId, branchId, status },
      user
    );
    const [data, total] = await Promise.all([
      repository.findAll({ ...queryFilters, page, pageSize }),
      repository.count(queryFilters),
    ]);
    return { data: data.map(sanitize), total, page: Number(page), pageSize: Number(pageSize) };
  },

  async findById(id, user) {
    const record = await repository.findById(id);
    assertBranchAccess(record, user, 'User not found');
    return sanitize(record);
  },

  async create(payload, user, req) {
    // FIX (aislamiento por sede): valida que la sede del nuevo usuario sea
    // una de las sedes asignadas al usuario que lo crea.
    assertBranchForCreate(payload, user);
    const code = await generateCode('USR');
    // SEGURIDAD (alto A1): nunca usar una contraseña por defecto conocida.
    // El validador ya exige contraseña fuerte; esto es defensa en profundidad.
    if (!payload.password) {
      throw new AppError('Password is required to create a user', 400);
    }
    const hashedPassword = await bcrypt.hash(payload.password, 12);
    const data = {
      ...pick(payload, ALLOWED_FIELDS),
      code,
      password: hashedPassword,
      status: payload.status || 'ACTIVE',
      created_by: user.id,
      updated_by: user.id
    };
    delete data.password_confirmation;
    const [id] = await repository.create(data);
    // Bug fix: keep the login-time `user_roles` table in sync with the
    // `role_id` this form actually sets — see the note on
    // users.model.js#ensureRole for why this was silently locking out
    // every normally-created user.
    await repository.ensureRole(id, data.role_id);
    const record = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'CREATE',
      module: 'users',
      recordCode: code,
      after: sanitize(record),
      req
    });
    
    return sanitize(record);
  },

  async update(id, payload, user, req) {
    const existing = await repository.findById(id);
    assertBranchAccess(existing, user, 'User not found');
    // FIX (aislamiento por sede): impide mover la cuenta a una sede ajena.
    assertBranchChangeAllowed(payload, user);

    // Defense in depth: even though findById/findAll no longer return the
    // hash to the client, never let a bare `password` field reach the
    // hasher unless the caller is deliberately changing it (a real new
    // password won't collide with bcrypt's own hash format).
    if (payload.password && payload.password.startsWith('$2')) {
      delete payload.password;
    }

    // FIX (auditoria hallazgo C2 - escalamiento de privilegios, 2/2):
    // `role_id` es una columna real de `users`, así que el whitelist de
    // ALLOWED_FIELDS por sí solo no evita que alguien con `users.edit` se
    // reasigne a sí mismo un rol de mayor jerarquía (ej. SUPER_ADMIN).
    // Combinado con el primer eslabón corregido en roles.service.js
    // (autoconcesión de permisos), aquí se cierran las dos formas de
    // escalar: cambiarse el propio rol, o asignarle a un tercero un rol que
    // uno mismo no tiene.
    const isSuperAdmin = (user.roles || []).includes('SUPER_ADMIN');
    if (payload.role_id !== undefined && Number(payload.role_id) !== Number(existing.role_id)) {
      if (Number(id) === Number(user.id)) {
        throw new AppError('No puede cambiar su propio rol', 403);
      }
      if (!isSuperAdmin) {
        const targetRole = await rolesRepository.findById(payload.role_id);
        if (targetRole && targetRole.name === 'SUPER_ADMIN') {
          throw new AppError('Solo un SUPER_ADMIN puede asignar el rol SUPER_ADMIN', 403);
        }
      }
    }

    const before = sanitize(existing);
    // FIX (segunda pasada de auditoría, MEDIO #3): si el cambio de
    // contraseña entra por PUT /users/:id, debe pasar por updatePassword
    // (que fija password_changed_at y con ello invalida los refresh tokens
    // previos, ver medio M6) en vez de la vía genérica de update().
    const fields = { ...pick(payload, ALLOWED_FIELDS), updated_by: user.id };
    delete fields.password;
    await repository.update(id, fields);
    if (payload.password) {
      await repository.updatePassword(id, await bcrypt.hash(payload.password, 12));
    }
    // FIX (roles acumulados): si este edit cambia role_id, hay que
    // reemplazar el rol viejo por el nuevo en `user_roles` (no solo
    // agregar el nuevo — ver users.model.js#replacePrimaryRole). Con el
    // ensureRole() anterior, bajarle el rol a alguien desde este
    // desplegable no le quitaba los permisos del rol anterior.
    if (payload.role_id) {
      await repository.replacePrimaryRole(id, existing.role_id, payload.role_id);
    }
    const after = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'UPDATE',
      module: 'users',
      recordCode: existing.code,
      before,
      after: sanitize(after),
      req
    });
    
    return sanitize(after);
  },

  async softDelete(id, user, req) {
    const existing = await repository.findById(id);
    assertBranchAccess(existing, user, 'User not found');
    if (existing.id === user.id) throw new AppError('Cannot delete yourself', 403);
    
    await repository.softDelete(id, user.id);
    
    await auditService.log({
      user,
      action: 'DELETE',
      module: 'users',
      recordCode: existing.code,
      before: sanitize(existing),
      req
    });
    
    return true;
  },

  // Perfil propio (Profile.jsx): solo campos personales, nunca rol,
  // status, branch ni password — es autoservicio y no debe poder escalar
  // privilegios ni desbloquear la propia cuenta.
  async updateProfile(userId, payload, user, req) {
    if (Number(userId) !== Number(user.id)) {
      throw new AppError('You can only update your own profile', 403);
    }
    const existing = await repository.findById(userId);
    if (!existing) throw new AppError('User not found', 404);

    const before = sanitize(existing);
    await repository.update(userId, { ...pick(payload, PROFILE_FIELDS), updated_by: user.id });
    const after = await repository.findById(userId);

    await auditService.log({
      user,
      action: 'UPDATE_PROFILE',
      module: 'users',
      recordCode: existing.code,
      before,
      after: sanitize(after),
      req
    });

    return sanitize(after);
  },

  async changePassword(id, currentPassword, newPassword, user, req) {
    const existing = await repository.findById(id);
    if (!existing) throw new AppError('User not found', 404);
    // SEGURIDAD (medio M4): sin este control, cualquier usuario con
    // users.edit podía cambiar la contraseña de un usuario de OTRA sede
    // (incluido un SUPER_ADMIN) conociendo su contraseña actual.
    assertBranchAccess(existing, user, 'User not found');

    const isSelf = Number(id) === Number(user.id);
    // El propio usuario SIEMPRE debe probar que conoce su contrasena actual
    // (evita que una sesion robada cambie la clave sin conocimiento del
    // dueno). Un administrador reseteando la cuenta de un tercero, en
    // cambio, no puede conocerla: la operacion queda autorizada por el
    // permiso users.edit y registrada en la auditoria.
    if (isSelf || currentPassword) {
      if (!currentPassword) {
        throw new AppError('Current password is required', 400);
      }
      const isValid = await bcrypt.compare(currentPassword, existing.password);
      if (!isValid) throw new AppError('Current password is incorrect', 401);
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await repository.updatePassword(id, hashedPassword);
    
    await auditService.log({
      user,
      action: 'CHANGE_PASSWORD',
      module: 'users',
      recordCode: existing.code,
      before: { password_changed_at: existing.password_changed_at },
      after: { password_changed_at: new Date().toISOString(), reset_by_admin: !isSelf },
      req
    });
    
    return true;
  },

  async getRoles(id, user) {
    const existing = await repository.findById(id);
    if (!existing) throw new AppError('User not found', 404);
    // Bug fix: same issue as Roles' "Permissions" action — the frontend's
    // "Assign Roles" link pointed at /users/:id/roles, but only the POST
    // side (to save) existed. There was no GET to load which roles were
    // already assigned, so the screen had nothing real to render.
    return repository.getRoles(id);
  },

  async assignRoles(id, roleIds, user, req) {
    const existing = await repository.findById(id);
    if (!existing) throw new AppError('User not found', 404);

    // FIX (auditoria hallazgo C2 - escalamiento de privilegios): esta tabla
    // (`user_roles`) es la que realmente usa el login para construir
    // `roles`/`permissions` del JWT (ver users.model.getRoles/getPermissions),
    // así que sin estos dos controles era una segunda vía, independiente de
    // `role_id`, para que un usuario con `users.edit` se autoasignara
    // SUPER_ADMIN (o se lo asignara a un tercero sin ser él mismo
    // SUPER_ADMIN).
    if (Number(id) === Number(user.id)) {
      throw new AppError('No puede modificar sus propios roles', 403);
    }
    const isSuperAdmin = (user.roles || []).includes('SUPER_ADMIN');
    if (!isSuperAdmin && roleIds && roleIds.length > 0) {
      const targetRoles = await Promise.all(roleIds.map((roleId) => rolesRepository.findById(roleId)));
      const grantsSuperAdmin = targetRoles.some((r) => r && r.name === 'SUPER_ADMIN');
      if (grantsSuperAdmin) {
        throw new AppError('Solo un SUPER_ADMIN puede asignar el rol SUPER_ADMIN', 403);
      }
    }

    const before = await repository.getRoles(id);
    await repository.clearRoles(id);
    if (roleIds && roleIds.length > 0) {
      await repository.assignRoles(id, roleIds);
    }
    const after = await repository.getRoles(id);
    
    await auditService.log({
      user,
      action: 'ASSIGN_ROLES',
      module: 'users',
      recordCode: existing.code,
      before: { roles: before },
      after: { roles: after },
      req
    });
    
    return after;
  }
};

module.exports = UsersService;