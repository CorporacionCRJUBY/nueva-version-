// FILE: backend/src/services/roles.service.js
const AppError = require('../utils/AppError');
const repository = require('../repositories/roles.repository');
const permissionsRepository = require('../repositories/permissions.repository');
const usersRepository = require('../repositories/users.repository');
const { generateCode } = require('../utils/codeGenerator');
const auditService = require('./audit.service');
const { pick } = require('../utils/pick');

// FIX (auditoria hallazgo C2 - escalamiento de privilegios): una acción se
// considera "comodín" si otorga TODO un módulo o TODO el sistema, es decir
// si module === '*' o action === '*' (cubre tanto un futuro permiso literal
// "*" como "modulo.*", el patrón que ya reconoce como wildcard el propio
// rbac.middleware). Solo un SUPER_ADMIN puede otorgar ese tipo de permiso.
const isWildcardPermission = (permission) =>
  permission.module === '*' || permission.action === '*';

// FIX (auditoria hallazgo #5 - mass assignment): whitelist explícita de
// columnas reales de la tabla que el cliente puede escribir. Cualquier
// otro campo del body se ignora en vez de llegar crudo al INSERT/UPDATE.
const ALLOWED_FIELDS = ['name', 'description', 'status'];

const RolesService = {
  async findAll(filters, user) {
    const { page = 1, pageSize = 20, search, name, status } = filters;
    const queryFilters = { search, name, status };
    const [data, total] = await Promise.all([
      repository.findAll({ ...queryFilters, page, pageSize }),
      repository.count(queryFilters),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  },

  async findById(id, user) {
    const record = await repository.findById(id);
    if (!record) throw new AppError('Role not found', 404);
    return record;
  },

  async create(payload, user, req) {
    const code = await generateCode('ROL');
    const data = {
      ...pick(payload, ALLOWED_FIELDS),
      code,
      status: payload.status || 'ACTIVE',
      created_by: user.id,
      updated_by: user.id
    };
    const [id] = await repository.create(data);
    const record = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'CREATE',
      module: 'roles',
      recordCode: code,
      after: record,
      req
    });
    
    return record;
  },

  async update(id, payload, user, req) {
    const existing = await repository.findById(id);
    if (!existing) throw new AppError('Role not found', 404);
    if (existing.name === 'SUPER_ADMIN') throw new AppError('Cannot modify SUPER_ADMIN role', 403);
    
    const before = { ...existing };
    await repository.update(id, { ...pick(payload, ALLOWED_FIELDS), updated_by: user.id });
    const after = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'UPDATE',
      module: 'roles',
      recordCode: existing.code,
      before,
      after,
      req
    });
    
    return after;
  },

  async softDelete(id, user, req) {
    const existing = await repository.findById(id);
    if (!existing) throw new AppError('Role not found', 404);
    if (existing.name === 'SUPER_ADMIN') throw new AppError('Cannot delete SUPER_ADMIN role', 403);
    
    await repository.softDelete(id, user.id);
    
    await auditService.log({
      user,
      action: 'DELETE',
      module: 'roles',
      recordCode: existing.code,
      before: existing,
      req
    });
    
    return true;
  },

  async getPermissions(id, user) {
    const existing = await repository.findById(id);
    if (!existing) throw new AppError('Role not found', 404);
    // Bug fix: the frontend's "Permissions" action linked to a route that
    // had no matching GET endpoint (only POST /:id/permissions existed to
    // *assign* them), so opening it silently rendered the plain edit form
    // instead of a permissions screen. This gives it real data to show,
    // using the same module.action grouping the Permissions catalog uses.
    return permissionsRepository.findByRole(id);
  },

  async assignPermissions(id, permissionIds, user, req) {
    const existing = await repository.findById(id);
    if (!existing) throw new AppError('Role not found', 404);
    if (existing.name === 'SUPER_ADMIN') throw new AppError('Cannot modify SUPER_ADMIN role permissions', 403);

    const isSuperAdmin = (user.roles || []).includes('SUPER_ADMIN');

    // FIX (auditoria hallazgo C2 - escalamiento de privilegios, paso 1/2):
    // un usuario con `roles.edit` ya no puede tocar los permisos del/de los
    // rol(es) que él mismo tiene asignados. Sin esto, bastaba con editar el
    // propio rol para autoconcederse cualquier permiso, incluyendo uno
    // comodín. Un SUPER_ADMIN queda exento porque de todas formas su ruta
    // pasa siempre el authorize() (ver rbac.middleware) y porque el rol
    // SUPER_ADMIN ya está bloqueado arriba.
    if (!isSuperAdmin) {
      const ownRoles = await usersRepository.getRoles(user.id);
      const isOwnRole = ownRoles.some((r) => r.id === existing.id);
      if (isOwnRole) {
        throw new AppError('No puede modificar los permisos de su propio rol', 403);
      }
    }

    // FIX (auditoria hallazgo C2 - escalamiento de privilegios, paso 2/2):
    // solo un SUPER_ADMIN puede conceder un permiso comodín ("*" o
    // "modulo.*") a un rol. Antes, cualquier usuario con `roles.edit` podía
    // enviar el permissionId de un comodín (existente o creado vía
    // `permissions.create`) y convertir ese rol en administrador total.
    if (!isSuperAdmin && permissionIds && permissionIds.length > 0) {
      const permissionsToAssign = await permissionsRepository.findByIds(permissionIds);
      const hasWildcard = permissionsToAssign.some(isWildcardPermission);
      if (hasWildcard) {
        throw new AppError('Solo un SUPER_ADMIN puede asignar permisos comodín ("*")', 403);
      }
    }

    const before = await permissionsRepository.findByRole(id);
    await repository.clearPermissions(id);
    if (permissionIds && permissionIds.length > 0) {
      await repository.assignPermissions(id, permissionIds);
    }
    const after = await permissionsRepository.findByRole(id);
    
    await auditService.log({
      user,
      action: 'ASSIGN_PERMISSIONS',
      module: 'roles',
      recordCode: existing.code,
      before: { permissions: before },
      after: { permissions: after },
      req
    });
    
    return after;
  }
};

module.exports = RolesService;
