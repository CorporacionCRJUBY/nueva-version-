'use strict';

const AppError = require('../utils/AppError');

const authorize = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }

    if (req.user.roles && req.user.roles.includes('SUPER_ADMIN')) {
      return next();
    }

    const userPermissions = req.user.permissions || [];
    const hasPermission = userPermissions.some((perm) => {
      if (perm === '*') {
        return true;
      }
      if (typeof perm !== 'string') {
        return false;
      }
      if (perm.endsWith('.*')) {
        const moduleName = perm.replace(/\.\*$/, '');
        return requiredPermission.startsWith(moduleName + '.');
      }
      return perm === requiredPermission;
    });

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: `Permission denied: ${requiredPermission}`,
      });
    }

    return next();
  };
};

const can = (requiredPermission) => {
  return authorize(requiredPermission);
};

module.exports = {
  authorize,
  can,
};
