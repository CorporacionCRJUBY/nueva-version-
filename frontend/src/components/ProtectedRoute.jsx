// FILE: frontend/src/components/ProtectedRoute.jsx
import { sx } from '../ui/sx';
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../hooks/useAuth';
import { Box, CircularProgress } from '@mui/material';

/**
 * Componente que protege rutas que requieren autenticación
 */
const ProtectedRoute = ({
  children,
  permission,
  anyPermissions,
  module,
  action,
  redirectTo = '/login',
  requireAuth = true,
}) => {
  const { user, loading, hasPermission, hasModulePermission } = useAuth();
  const location = useLocation();

  // Mostrar loading mientras se verifica autenticación
  if (loading) {
    return (
      <Box style={sx({ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' })}>
        <CircularProgress />
      </Box>
    );
  }

  // Verificar autenticación
  if (requireAuth && !user) {
    // FIX (auditoria hallazgo bajo B1): guardar la página de origen para que
    // Login.jsx (que ya lee location.state?.from) devuelva al usuario allí.
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Si no requiere autenticación y ya hay usuario, redirigir al dashboard
  if (!requireAuth && user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Verificar permisos
  if (user && (permission || anyPermissions?.length || (module && action))) {
    let hasAccess = false;

    if (permission) {
      hasAccess = hasPermission(permission);
    } else if (anyPermissions?.length) {
      // FIX (auditoria hallazgo medio M2): acceso si el usuario tiene
      // CUALQUIERA de los permisos listados (útil para hubs como la consola
      // de administración, que agrupa varios módulos).
      hasAccess = anyPermissions.some((perm) => hasPermission(perm));
    } else if (module && action) {
      hasAccess = hasModulePermission(module, action);
    }

    if (!hasAccess) {
      // Redirigir a página de acceso denegado
      return <Navigate to="/forbidden" replace />;
    }
  }

  // Renderizar children o Outlet para rutas anidadas
  return children ? children : <Outlet />;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node,
  permission: PropTypes.string,
  anyPermissions: PropTypes.arrayOf(PropTypes.string),
  module: PropTypes.string,
  action: PropTypes.string,
  redirectTo: PropTypes.string,
  requireAuth: PropTypes.bool,
};

export default ProtectedRoute;