// FILE: frontend/src/components/PermissionGate.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../hooks/useAuth';

/**
 * Componente que renderiza children solo si el usuario tiene el permiso requerido
 */
const PermissionGate = ({
  permission,
  children,
  fallback = null,
  module,
  action,
}) => {
  const { user, hasPermission, hasModulePermission } = useAuth();

  // Si no hay usuario autenticado, mostrar fallback
  if (!user) {
    return fallback;
  }

  // Verificar permiso
  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (module && action) {
    hasAccess = hasModulePermission(module, action);
  } else {
    // Si no se especifica permiso, permitir acceso
    hasAccess = true;
  }

  return hasAccess ? children : fallback;
};

PermissionGate.propTypes = {
  permission: PropTypes.string,
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
  module: PropTypes.string,
  action: PropTypes.string,
};

export default PermissionGate;