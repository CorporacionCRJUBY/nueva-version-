// FILE: frontend/src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { api } from '../api/axiosClient';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // FIX (auditoria hallazgo medio #2 - JWT en localStorage): accessToken y
  // refreshToken ya no se guardan en localStorage (ver auth.controller.js
  // y axiosClient.js) — ahora viven solo en cookies httpOnly que JS no
  // puede leer. Por eso, al cargar la app ya no podemos "ver" si hay un
  // token válido consultando localStorage: se lo preguntamos al backend
  // con GET /auth/me, que responde con el usuario si la cookie (enviada
  // automáticamente por el navegador) sigue siendo válida, o 401 si no.
  // `user` se sigue cacheando en localStorage solo como dato no sensible
  // (perfil/roles) para poder pintar la UI sin parpadeo mientras se
  // confirma la sesión con el backend.
  useEffect(() => {
    const restoreSession = async () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          localStorage.removeItem('user');
        }
      }

      try {
        const response = await api.get('/auth/me');
        setUser(response.data);
        localStorage.setItem('user', JSON.stringify(response.data));
      } catch (e) {
        // No hay cookie válida (nunca hubo sesión, o expiró/fue revocada).
        setUser(null);
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  // Login
  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/auth/login', { email, password });

      // FIX (auditoria hallazgo bajo #2 - falta de 2FA): si la cuenta
      // tiene el segundo factor activo, el backend NO abre sesión con
      // solo email+password — devuelve un challengeToken de corta vida
      // (ver auth.service.js) que hay que canjear con verifyTwoFactor()
      // más abajo. Todavía no hay `user` ni cookies de sesión en este punto.
      if (response.data.twoFactorRequired) {
        return { success: false, twoFactorRequired: true, challengeToken: response.data.challengeToken };
      }

      const { user } = response.data;

      // Los tokens llegan solo vía Set-Cookie (httpOnly); aquí únicamente
      // cacheamos el perfil del usuario, que no es sensible.
      localStorage.setItem('user', JSON.stringify(user));

      setUser(user);
      return { success: true, user };
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Segundo paso del login para cuentas con 2FA (auditoria hallazgo bajo
  // #2): canjea el challengeToken + el código TOTP/de respaldo por una
  // sesión real, exactamente como termina login() para cuentas sin 2FA.
  const verifyTwoFactor = useCallback(async (challengeToken, code) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/auth/2fa/verify', { challengeToken, code });
      const { user } = response.data;
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      return { success: true, user };
    } catch (err) {
      setError(err.message || 'Error al verificar el código');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Autoservicio de 2FA (Profile.jsx) --------------------------------
  // Estas cuatro solo tienen sentido con una sesión ya activa (a
  // diferencia de login/verifyTwoFactor de arriba) — el backend las
  // protege con `authenticate` (ver auth.routes.js).
  const setupTwoFactor = useCallback(async () => {
    const response = await api.post('/auth/2fa/setup');
    return response.data; // { secret, otpauthUrl, qrCodeDataUrl }
  }, []);

  // FIX (auditoria hallazgo bajo B11): refreshUser se declara ANTES de las
  // funciones que lo usan (confirmTwoFactor/disableTwoFactor) para poder
  // incluirlo correctamente en sus dependencias.
  // Obtener datos actualizados del usuario
  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      const userData = response.data;
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    } catch (err) {
      console.error('Error al refrescar usuario:', err);
      return null;
    }
  }, []);

  const confirmTwoFactor = useCallback(
    async (code) => {
      const response = await api.post('/auth/2fa/confirm', { code });
      await refreshUser();
      return response.data; // { backupCodes }
    },
    [refreshUser]
  );

  const disableTwoFactor = useCallback(
    async (password) => {
      await api.post('/auth/2fa/disable', { password });
      await refreshUser();
    },
    [refreshUser]
  );

  const regenerateBackupCodes = useCallback(async (password) => {
    const response = await api.post('/auth/2fa/backup-codes/regenerate', { password });
    return response.data; // { backupCodes }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      // El refresh token ya no se lee de localStorage: viaja solo, vía
      // cookie httpOnly, y el backend lo revoca (ver auth.controller.js /
      // auditoria hallazgo alto #5) y limpia ambas cookies en la respuesta.
      await api.post('/auth/logout');
    } catch (e) {
      // Ignorar errores en logout
    }

    localStorage.removeItem('user');
    setUser(null);
  }, []);

  // Verificar si el usuario tiene un permiso específico
  const hasPermission = useCallback(
    (permission) => {
      if (!user) return false;
      if (user.roles?.includes('SUPER_ADMIN')) return true;
      return user.permissions?.includes(permission) || false;
    },
    [user]
  );

  // Verificar si el usuario tiene permiso para un módulo y acción
  const hasModulePermission = useCallback(
    (module, action) => {
      if (!user) return false;
      if (user.roles?.includes('SUPER_ADMIN')) return true;
      return hasPermission(`${module}.${action}`);
    },
    [user, hasPermission]
  );

  // Verificar si el usuario tiene un rol específico
  const hasRole = useCallback(
    (role) => {
      if (!user) return false;
      return user.roles?.includes(role) || false;
    },
    [user]
  );

  const value = {
    user,
    loading,
    error,
    login,
    verifyTwoFactor,
    setupTwoFactor,
    confirmTwoFactor,
    disableTwoFactor,
    regenerateBackupCodes,
    logout,
    hasPermission,
    hasModulePermission,
    hasRole,
    refreshUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};