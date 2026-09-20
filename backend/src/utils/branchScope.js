'use strict';

const AppError = require('./AppError');

/**
 * Helper utilities for branch-scoped operations.
 *
 * ACADEMIX supports multiple branches, and several services must enforce a
 * branch context before performing queries. This module centralizes that
 * enforcement so services share one policy.
 */

const BRANCH_REQUIRED_ROLES = new Set([
  'admin',
  'principal',
  'branch_manager',
  'teacher',
  'staff',
]);

/**
 * Normalize a branch identifier to the form expected by queries.
 */
function toBranchId(value) {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  if (normalized === '') {
    return null;
  }

  return normalized;
}

/**
 * Validate a branch context object derived from request auth/tenant info.
 */
function validateBranchContext(context) {
  if (!context || typeof context !== 'object') {
    throw new AppError('Branch context is required for this operation', 400);
  }

  const branchId = toBranchId(context.branchId);
  if (!branchId) {
    throw new AppError('branchId is required', 400, { field: 'branchId' });
  }

  const institutionId = toBranchId(context.institutionId);
  if (!institutionId) {
    throw new AppError('institutionId is required', 400, { field: 'institutionId' });
  }

  return {
    branchId,
    institutionId,
  };
}

/**
 * Extract and validate a branch scope from a request-like object.
 *
 * This expects `req.user` or `req.tenant` to carry branch information.
 */
function forRequest(req, options = {}) {
  const user = req?.user;

  if (!user) {
    if (options.allowUnscoped !== true) {
      throw new AppError('User context is required for branch-scoped operations', 401);
    }
    return null;
  }

  const context = {
    branchId: user.branchId ?? req?.branchId ?? null,
    institutionId: user.institutionId ?? req?.institutionId ?? null,
  };

  if (!context.branchId && !context.institutionId) {
    if (options.allowUnscoped !== true) {
      throw new AppError('No branch context available on the request', 400);
    }
    return null;
  }

  return validateBranchContext(context);
}

/**
 * Build a where clause fragment for branch-scoped tables.
 *
 * The returned object is meant to be merged into Knex query constraints.
 */
function whereFor(branchId, opts = {}) {
  const where = {};

  if (branchId) {
    where.branchId = branchId;
  }

  if (opts.multiTenant && opts.tenantId) {
    where.institutionId = opts.tenantId;
  }

  if (!branchId && !opts.tenantId) {
    return {};
  }

  return where;
}

/**
 * Check whether a role is generally branch-bound.
 */
function isBranchBound(role) {
  if (!role) {
    return false;
  }

  return BRANCH_REQUIRED_ROLES.has(role.toLowerCase());
}

/**
 * True si el usuario es SUPER_ADMIN (único rol que salta el aislamiento
 * por sede — mismo criterio que rbac.middleware.js y branchAccess.middleware.js).
 */
function isSuperAdmin(user) {
  return Boolean(user && Array.isArray(user.roles) && user.roles.includes('SUPER_ADMIN'));
}

/**
 * Sede(s) a las que tiene acceso el usuario autenticado (claim `branches`
 * del JWT: [branch_id]). Vacío = sin acceso a ninguna.
 */
function userBranchIds(user) {
  if (!user || !Array.isArray(user.branches)) {
    return [];
  }
  return user.branches.filter((b) => b != null);
}

/**
 * Restringe los filtros de un listado a las sedes del usuario. SUPER_ADMIN
 * no se toca; cualquier otro rol SIEMPRE recibe `branchIds` (las suyas),
 * de modo que aunque el cliente omita branch_id o pida otra sede, el
 * whereIn resultante impide ver registros ajenos.
 */
function scopeFiltersToUserBranches(filters = {}, user) {
  if (isSuperAdmin(user)) {
    return { ...filters };
  }

  const branches = userBranchIds(user);
  if (branches.length === 0) {
    // Sin sedes asignadas: el whereIn con lista vacía no devuelve nada.
    return { ...filters, branchIds: [] };
  }

  return { ...filters, branchIds: branches };
}

/**
 * Verifica que un registro cargado pertenezca a una sede del usuario.
 * Devuelve 404 con el mensaje dado tanto si el registro no existe como si
 * no pertenece a sus sedes (no revela existencia de registros ajenos).
 */
function assertBranchAccess(record, user, message = 'Record not found') {
  if (!record) {
    throw new AppError(message, 404);
  }
  if (isSuperAdmin(user)) {
    return;
  }
  const branches = userBranchIds(user);
  if (branches.length === 0 || !branches.includes(record.branch_id)) {
    throw new AppError(message, 404);
  }
}

/**
 * Al crear, un usuario no-SUPER_ADMIN solo puede asignar sus propias sedes
 * (y debe declarar una).
 */
function assertBranchForCreate(payload = {}, user) {
  if (isSuperAdmin(user)) {
    return;
  }
  const branchId = payload.branch_id ?? payload.branchId;
  if (branchId == null) {
    throw new AppError('branch_id is required for your role', 400, { field: 'branch_id' });
  }
  const branches = userBranchIds(user);
  if (!branches.includes(branchId)) {
    throw new AppError('You can only create records in your assigned branches', 403);
  }
}

/**
 * Al actualizar, impide mover un registro a una sede ajena (solo aplica si
 * el payload declara branch_id).
 */
function assertBranchChangeAllowed(payload = {}, user) {
  if (isSuperAdmin(user)) {
    return;
  }
  const branchId = payload.branch_id ?? payload.branchId;
  if (branchId == null) {
    return;
  }
  const branches = userBranchIds(user);
  if (!branches.includes(branchId)) {
    throw new AppError('You cannot move records to a branch you do not have access to', 403);
  }
}

module.exports = {
  toBranchId,
  validateBranchContext,
  forRequest,
  whereFor,
  isBranchBound,
  isSuperAdmin,
  userBranchIds,
  scopeFiltersToUserBranches,
  assertBranchAccess,
  assertBranchForCreate,
  assertBranchChangeAllowed,
};
