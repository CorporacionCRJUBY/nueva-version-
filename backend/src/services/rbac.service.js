'use strict';

const AppError = require('../utils/AppError');

const DEFAULT_ROLE_CAPABILITIES = {
  super_admin: ['*'],
  admin: ['users.manage', 'roles.manage', 'settings.manage', 'audit.view'],
  teacher: ['students.view', 'grades.manage', 'attendance.manage'],
  guardian: ['students.view:self', 'grades.view:self'],
  student: ['students.view:self', 'grades.view:self'],
};

function normalizeRole(role) {
  if (!role || typeof role !== 'string') {
    return 'unknown';
  }
  return role.trim().toLowerCase();
}

function roleHasCapability(role, capability) {
  const normalized = normalizeRole(role);
  const caps = DEFAULT_ROLE_CAPABILITIES[normalized];
  if (!caps) {
    return false;
  }
  if (caps.includes('*')) {
    return true;
  }
  return caps.includes(capability);
}

function canPerform(role, capability) {
  if (!role || !capability) {
    return false;
  }
  return roleHasCapability(role, capability);
}

function hasWildcardPermission(permissions, capability) {
  if (!permissions || !Array.isArray(permissions)) {
    return false;
  }
  if (permissions.includes('*')) {
    return true;
  }
  if (permissions.includes(capability)) {
    return true;
  }
  for (const perm of permissions) {
    if (typeof perm !== 'string') {
      continue;
    }
    if (perm.endsWith('.*')) {
      const moduleName = perm.replace(/\.\*$/, '');
      if (capability.startsWith(moduleName + '.')) {
        return true;
      }
    }
  }
  return false;
}

function isSuperAdmin(user) {
  if (!user || !user.roles || !Array.isArray(user.roles)) {
    return false;
  }
  return user.roles.includes('SUPER_ADMIN') || user.roles.includes('super_admin');
}

module.exports = {
  canPerform,
  hasWildcardPermission,
  isSuperAdmin,
  roleHasCapability,
  normalizeRole,
  DEFAULT_ROLE_CAPABILITIES,
};
