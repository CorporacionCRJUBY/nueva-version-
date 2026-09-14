// FILE: frontend/src/hooks/usePermissions.js
import { useMemo, useCallback } from 'react';
import { useAuth } from './useAuth';

export const usePermissions = () => {
  const { user, hasPermission, hasModulePermission, hasRole } = useAuth();

  const permissions = useMemo(() => {
    if (!user) return [];
    if (user.roles?.includes('SUPER_ADMIN')) return ['*'];
    return user.permissions || [];
  }, [user]);

  const permissionsByModule = useMemo(() => {
    const grouped = {};
    permissions.forEach(perm => {
      if (perm === '*') {
        grouped['*'] = ['*'];
        return;
      }
      const [module, action] = perm.split('.');
      if (!grouped[module]) grouped[module] = [];
      grouped[module].push(action);
    });
    return grouped;
  }, [permissions]);

  const hasFullModuleAccess = useCallback((module) => {
    if (!user) return false;
    if (user.roles?.includes('SUPER_ADMIN')) return true;
    const modulePerms = permissionsByModule[module] || [];
    return modulePerms.includes('*') || modulePerms.includes('all');
  }, [user, permissionsByModule]);

  const hasAnyModulePermission = useCallback((module) => {
    if (!user) return false;
    if (user.roles?.includes('SUPER_ADMIN')) return true;
    return !!(permissionsByModule[module] && permissionsByModule[module].length > 0);
  }, [user, permissionsByModule]);

  const getModuleActions = useCallback((module) => {
    if (!user) return [];
    if (user.roles?.includes('SUPER_ADMIN')) return ['*'];
    return permissionsByModule[module] || [];
  }, [user, permissionsByModule]);

  const canView = useCallback((module) => hasModulePermission(module, 'view'), [hasModulePermission]);
  const canCreate = useCallback((module) => hasModulePermission(module, 'create'), [hasModulePermission]);
  const canEdit = useCallback((module) => hasModulePermission(module, 'edit'), [hasModulePermission]);
  const canDelete = useCallback((module) => hasModulePermission(module, 'delete'), [hasModulePermission]);

  const canGenerateReports = useCallback(() => {
    return hasPermission('reports.generate') || hasRole('SUPER_ADMIN');
  }, [hasPermission, hasRole]);

  const canViewAudit = useCallback(() => {
    return hasPermission('audit.view') || hasRole('SUPER_ADMIN');
  }, [hasPermission, hasRole]);

  const canManageUsers = useCallback(() => {
    return hasPermission('users.edit') || hasRole('SUPER_ADMIN');
  }, [hasPermission, hasRole]);

  const canManageSettings = useCallback(() => {
    return hasPermission('settings.edit') || hasRole('SUPER_ADMIN');
  }, [hasPermission, hasRole]);

  return {
    permissions,
    permissionsByModule,
    hasPermission,
    hasModulePermission,
    hasRole,
    hasFullModuleAccess,
    hasAnyModulePermission,
    getModuleActions,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canGenerateReports,
    canViewAudit,
    canManageUsers,
    canManageSettings,
    students: {
      view: () => canView('students'),
      create: () => canCreate('students'),
      edit: () => canEdit('students'),
      delete: () => canDelete('students'),
    },
    teachers: {
      view: () => canView('teachers'),
      create: () => canCreate('teachers'),
      edit: () => canEdit('teachers'),
      delete: () => canDelete('teachers'),
    },
    subjects: {
      view: () => canView('subjects'),
      create: () => canCreate('subjects'),
      edit: () => canEdit('subjects'),
      delete: () => canDelete('subjects'),
    },
    grades: {
      view: () => canView('grades'),
      create: () => canCreate('grades'),
      edit: () => canEdit('grades'),
      delete: () => canDelete('grades'),
    },
    attendance: {
      view: () => canView('attendance'),
      create: () => canCreate('attendance'),
      edit: () => canEdit('attendance'),
      delete: () => canDelete('attendance'),
    },
    users: {
      view: () => canView('users'),
      create: () => canCreate('users'),
      edit: () => canEdit('users'),
      delete: () => canDelete('users'),
    },
  };
};