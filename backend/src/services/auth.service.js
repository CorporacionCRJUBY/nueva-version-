// FILE: backend/src/services/auth.service.js
const AppError = require('../utils/AppError');
const bcrypt = require('bcryptjs');
const jwt = require('../config/jwt');
const usersRepository = require('../repositories/users.repository');
const revokedTokensRepository = require('../repositories/revokedTokens.repository');
const auditService = require('./audit.service');
const twoFactor = require('../utils/twoFactor');
const { encrypt: encryptField } = require('../utils/cryptoBox');
const QRCode = require('qrcode');

// Cuántos códigos de respaldo se emiten en cada setup/regeneración
// (auditoria hallazgo bajo #2 - 2FA).
const BACKUP_CODES_COUNT = 10;

// SEGURIDAD (auditoria 2026-08-31, bajo B1): hash bcrypt de relleno para
// ejecutar una comparación aunque el email no exista. Sin esto, las
// peticiones con email inexistente respondían mucho más rápido (sin coste
// de bcrypt) y revelaban por timing qué cuentas existen. El valor es un
// hash inerte precomputado (rounds 12, como el resto del sistema).
const DUMMY_HASH = '$2b$12$tr1/GgRIiMiq3UwBRL3VXuSh88FZ8y1CYt9AXcI3FiQVt8YnOLYcG';

// Arma el payload de sesión (roles/permisos) e issuea el par de tokens
// reales, reutilizado tanto por el login sin 2FA como por el paso final
// del login con 2FA (auth.service.js#verifyTwoFactor).
async function issueSessionTokens(user) {
  const roles = await usersRepository.getRoles(user.id);
  const permissions = await usersRepository.getPermissions(user.id);

  const payload = {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    roles: roles.map((r) => r.name),
    permissions: permissions.map((p) => `${p.module}.${p.action}`),
    branches: [user.branch_id].filter(Boolean),
  };

  const accessToken = await jwt.signAccessToken(payload);
  const refreshToken = await jwt.signRefreshToken({ userId: user.id });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      roles: roles.map((r) => r.name),
      permissions: permissions.map((p) => `${p.module}.${p.action}`),
      branch_id: user.branch_id,
    },
  };
}

const AuthService = {
  async login(email, password, req) {
    const user = await usersRepository.findByEmail(email);

    // Bloqueo de cuenta: si ya está bloqueada por intentos fallidos previos,
    // rechazar sin sumarle otro intento fallido al contador mientras dure el
    // bloqueo. FIX (segunda pasada, BAJO #12): se ejecuta igualmente una
    // comparación bcrypt de relleno para que el tiempo de respuesta no
    // revele que la cuenta existe y está bloqueada.
    if (user && usersRepository.isLocked(user)) {
      await bcrypt.compare(password, DUMMY_HASH);
      throw new AppError('Account locked due to too many failed login attempts. Try again later.', 423);
    }

    // SEGURIDAD (bajo B1): siempre se ejecuta una comparación bcrypt, aunque
    // el email no exista, para que el tiempo de respuesta no revele qué
    // cuentas están registradas.
    let passwordOk = false;
    if (user) {
      passwordOk = await bcrypt.compare(password, user.password);
    } else {
      await bcrypt.compare(password, DUMMY_HASH);
    }

    if (!user || !passwordOk) {
      if (user) {
        const lockedUntil = await usersRepository.registerFailedLogin(user.id);
        if (lockedUntil) {
          throw new AppError('Account locked due to too many failed login attempts. Try again later.', 423);
        }
      }
      throw new AppError('Invalid credentials', 401);
    }

    // SEGURIDAD (alto A3): ni INACTIVE ni SUSPENDED pueden iniciar sesión.
    // Antes el login solo rechazaba INACTIVE y las cuentas suspendidas
    // entraban normalmente (verifyTwoFactor/refreshToken sí rechazaban
    // ambas). El mensaje es genérico para no revelar el estado de la
    // cuenta (enumeración, bajo B1).
    if (user.status !== 'ACTIVE') {
      throw new AppError('Invalid credentials', 401);
    }
    
    // Password correcta: resetear el contador de intentos fallidos ya
    // mismo, independientemente de si falta o no el segundo factor (si no
    // se hiciera aquí, un usuario con 2FA activo que fallara varias veces
    // el CÓDIGO en verifyTwoFactor podría terminar bloqueado por
    // login_attempts pese a haber puesto bien la contraseña cada vez —
    // ver comentario en verifyTwoFactor sobre por qué esos intentos
    // fallidos SÍ deben contar aparte).
    await usersRepository.resetLoginAttempts(user.id);

    // FIX (auditoria hallazgo bajo #2 - falta de 2FA): si la cuenta tiene
    // el segundo factor activo, el password correcto NO alcanza para abrir
    // sesión. En vez de tokens de sesión reales, se emite un token de
    // "desafío" de 5 minutos (ver config/jwt.js#signTwoFactorChallenge)
    // que el frontend debe canjear en POST /auth/2fa/verify junto con un
    // código TOTP (o de respaldo) válido. Este token de desafío no sirve
    // para autenticar ninguna otra petición a la API.
    if (user.twofa_enabled) {
      const challengeToken = await jwt.signTwoFactorChallenge({ userId: user.id });
      return { twoFactorRequired: true, challengeToken };
    }

    await usersRepository.updateLastLogin(user.id);

    const session = await issueSessionTokens(user);

    // Log audit
    await auditService.log({
      user: { id: user.id },
      action: 'LOGIN',
      module: 'auth',
      recordCode: user.email,
      req
    });

    return { twoFactorRequired: false, ...session };
  },

  // FIX (auditoria hallazgo bajo #2 - falta de 2FA): segundo paso del
  // login para cuentas con 2FA activo. Canjea el challengeToken de 5
  // minutos emitido por login() junto con un código (TOTP de 6 dígitos o
  // uno de los códigos de respaldo de un solo uso) por una sesión real.
  async verifyTwoFactor(challengeToken, code, req) {
    let decoded;
    try {
      decoded = await jwt.verifyTwoFactorChallenge(challengeToken);
    } catch {
      throw new AppError('Invalid or expired 2FA challenge', 401);
    }

    // SEGURIDAD (bajo B2): el challenge canjeado con éxito es de UN solo
    // uso. FIX (segunda pasada, MEDIO #5): la compuerta atómica es el
    // insert de revocación (revoke() devuelve 0 si el jti ya estaba),
    // pero se ejecuta DESPUÉS de validar el código: si se consumiera
    // antes, un solo código mal tipeado quemaría el challenge entero y el
    // usuario tendría que reloguear (contradice el flujo TOTP estándar,
    // que permite reintentos dentro del TTL con rate limiting). El replay
    // de un challenge YA canjeado se rechaza aquí con un read-check.
    const alreadyConsumed = await revokedTokensRepository.isRevoked(decoded.jti);
    if (alreadyConsumed) {
      throw new AppError('Invalid or expired 2FA challenge', 401);
    }

    const user = await usersRepository.findById(decoded.userId);
    if (!user) throw new AppError('User not found', 404);
    if (user.status === 'INACTIVE' || user.status === 'SUSPENDED') {
      throw new AppError('User account is inactive', 403);
    }

    // Los intentos fallidos de CÓDIGO 2FA se cuentan con el mismo
    // mecanismo de bloqueo que los de contraseña (login_attempts /
    // locked_until): sin esto, alguien que ya conoce la contraseña de la
    // víctima podría probar los 10^6 códigos TOTP posibles sin ningún
    // límite. Un login exitoso con contraseña correcta pero sin 2FA
    // resuelto todavía NO se considera una sesión abierta.
    if (usersRepository.isLocked(user)) {
      throw new AppError('Account locked due to too many failed login attempts. Try again later.', 423);
    }

    // FIX (segunda pasada, BAJO #10): si el descifrado del secreto TOTP
    // falla (p. ej. rotación de ENCRYPTION_KEY) o el JSON de los códigos de
    // respaldo está corrupto, responder con un error controlado en vez de
    // un 500 opaco con stack.
    let twoFaState;
    try {
      twoFaState = await usersRepository.findTwoFactorState(user.id);
    } catch {
      throw new AppError('Two-factor authentication is temporarily unavailable for this account', 503);
    }
    if (!twoFaState?.twofa_enabled || !twoFaState.twofa_secret) {
      // La cuenta desactivó 2FA entre el login() y este paso (o nunca lo
      // tuvo activo del todo) — no hay nada que verificar.
      throw new AppError('Two-factor authentication is not enabled for this account', 400);
    }

    let valid = twoFactor.verifyTOTP(twoFaState.twofa_secret, code);
    let consumedBackupCode = false;

    if (!valid) {
      // No coincidió como código TOTP: probar como código de respaldo.
      let storedHashes = [];
      if (twoFaState.twofa_backup_codes) {
        try {
          storedHashes = JSON.parse(twoFaState.twofa_backup_codes);
        } catch {
          storedHashes = [];
        }
      }
      const remaining = await twoFactor.consumeBackupCode(code, storedHashes);
      if (remaining !== null) {
        valid = true;
        consumedBackupCode = true;
        await usersRepository.replaceBackupCodes(user.id, remaining);
      }
    }

    if (!valid) {
      const lockedUntil = await usersRepository.registerFailedLogin(user.id);
      if (lockedUntil) {
        throw new AppError('Account locked due to too many failed login attempts. Try again later.', 423);
      }
      throw new AppError('Invalid two-factor authentication code', 401);
    }

    // SEGURIDAD (hardening 2026-08-31): migración lazy — los secretos
    // creados antes del cifrado en reposo (AES-256-GCM, utils/cryptoBox.js)
    // estaban en texto plano en users.twofa_secret; se recifran en el
    // primer 2FA válido posterior al despliegue.
    if (!twoFaState.twofa_secret_encrypted) {
      await usersRepository.upgradeTwoFactorSecret(user.id, encryptField(twoFaState.twofa_secret));
    }

    // Canje atómico: si otra petición paralela con este mismo challenge
    // llegó primero y ya lo revocó, revoke() devuelve 0 y esta no emite
    // sesión. Con un código válido esto no debería ocurrir en la práctica,
    // pero cierra la carrera sin confiar en el read-check de arriba.
    const claimed = await revokedTokensRepository.revoke({
      jti: decoded.jti,
      userId: decoded.userId,
      tokenType: '2fa_challenge',
      expiresAt: new Date(decoded.exp * 1000)
    });
    if (!claimed) {
      throw new AppError('Invalid or expired 2FA challenge', 401);
    }

    await usersRepository.updateLastLogin(user.id);
    const session = await issueSessionTokens(user);

    await auditService.log({
      user: { id: user.id },
      action: 'LOGIN',
      module: 'auth',
      recordCode: user.email,
      after: consumedBackupCode ? { via: '2fa_backup_code' } : { via: '2fa_totp' },
      req
    });

    return session;
  },

  // Paso 1 de activar 2FA: genera un secreto nuevo y lo deja en
  // "pendiente" (no habilita nada todavía) hasta que el usuario confirme
  // que efectivamente lo registró en su app autenticadora, ver
  // confirmTwoFactor. Puede llamarse varias veces (ej. si el usuario
  // cierra el diálogo a medio camino); cada llamada reemplaza el
  // pendiente anterior.
  async setupTwoFactor(userId) {
    const user = await usersRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    if (user.twofa_enabled) {
      throw new AppError('Two-factor authentication is already enabled', 409);
    }

    const secret = twoFactor.generateSecret();
    await usersRepository.setPendingTwoFactorSecret(userId, secret);

    const otpauthUrl = twoFactor.createTOTPUrl(secret, user.email);
    // El QR se genera server-side (imagen PNG en data URL) para que el
    // frontend no tenga que traer su propia librería de generación de QR
    // ni volver a construir la otpauth URL — solo pintarla.
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    return { secret, otpauthUrl, qrCodeDataUrl };
  },

  // Paso 2: el usuario manda un código generado por su app autenticadora
  // para demostrar que el secreto quedó bien registrado. Solo entonces se
  // activa 2FA de verdad y se generan los códigos de respaldo (que se
  // devuelven en claro esta única vez).
  async confirmTwoFactor(userId, code) {
    const twoFaState = await usersRepository.findTwoFactorState(userId);
    if (!twoFaState?.twofa_pending_secret) {
      throw new AppError('No pending two-factor setup found. Start setup again.', 400);
    }

    const valid = twoFactor.verifyTOTP(twoFaState.twofa_pending_secret, code);
    if (!valid) {
      throw new AppError('Invalid verification code', 401);
    }

    const backupCodes = twoFactor.generateBackupCodes(BACKUP_CODES_COUNT);
    const hashedBackupCodes = await twoFactor.hashBackupCodes(backupCodes);

    await usersRepository.enableTwoFactor(userId, twoFaState.twofa_pending_secret, hashedBackupCodes);

    return { backupCodes };
  },

  // Requiere la contraseña actual (no solo estar autenticado) porque
  // desactivar 2FA reduce la seguridad de la cuenta: si alguien deja una
  // sesión abierta sin bloquear, no debería poder quitar el segundo
  // factor con un solo clic.
  async disableTwoFactor(userId, password, req) {
    const user = await usersRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new AppError('Invalid password', 401);

    await usersRepository.disableTwoFactor(userId);

    await auditService.log({
      user: { id: userId },
      action: 'UPDATE',
      module: 'auth',
      recordCode: user.email,
      after: { twofa_enabled: false },
      reason: '2FA disabled by user',
      req
    });

    return true;
  },

  // Igual que disableTwoFactor, exige contraseña: los códigos de respaldo
  // son en sí mismos una vía de acceso a la cuenta, así que regenerarlos
  // (invalidando los anteriores) es una acción sensible.
  async regenerateBackupCodes(userId, password) {
    const user = await usersRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    if (!user.twofa_enabled) {
      throw new AppError('Two-factor authentication is not enabled', 400);
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new AppError('Invalid password', 401);

    const backupCodes = twoFactor.generateBackupCodes(BACKUP_CODES_COUNT);
    const hashedBackupCodes = await twoFactor.hashBackupCodes(backupCodes);
    await usersRepository.replaceBackupCodes(userId, hashedBackupCodes);

    return { backupCodes };
  },
  
  async getCurrentUser(userId) {
    const user = await usersRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    
    const roles = await usersRepository.getRoles(userId);
    const permissions = await usersRepository.getPermissions(userId);
    
    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      roles: roles.map(r => r.name),
      permissions: permissions.map(p => `${p.module}.${p.action}`),
      branch_id: user.branch_id,
      status: user.status,
      // Necesario para que el frontend (Profile.jsx) sepa si mostrar
      // "Activar 2FA" o "Desactivar 2FA" — nunca se expone el secreto ni
      // los códigos de respaldo aquí.
      twofa_enabled: Boolean(user.twofa_enabled)
    };
  },
  
  // FIX (auditoria hallazgo alto #5 - el logout no invalida tokens): revoca
  // tanto el access token con el que se autenticó esta request (su jti/exp
  // ya vienen en `authUser`, adjuntados por auth.middleware) como, si el
  // cliente lo manda, el refresh token asociado. Revocar solo el access
  // token no alcanza: ese mismo refresh token seguiría pudiendo pedir un
  // access token *nuevo* (no revocado) en /auth/refresh, dejando el logout
  // sin efecto real.
  async logout(authUser, refreshToken, req) {
    if (authUser.jti && authUser.exp) {
      await revokedTokensRepository.revoke({
        jti: authUser.jti,
        userId: authUser.id,
        tokenType: 'access',
        expiresAt: new Date(authUser.exp * 1000)
      });
    }

    if (refreshToken) {
      try {
        const decoded = await jwt.verifyRefreshToken(refreshToken);
        await revokedTokensRepository.revoke({
          jti: decoded.jti,
          userId: decoded.userId,
          tokenType: 'refresh',
          expiresAt: new Date(decoded.exp * 1000)
        });
      } catch {
        // Token de refresh ya inválido/expirado/ajeno: nada que revocar,
        // y no debe impedir que el logout del access token se complete.
      }
    }

    await auditService.log({
      user: { id: authUser.id },
      action: 'LOGOUT',
      module: 'auth',
      req
    });
    return true;
  },
  
  async refreshToken(refreshToken) {
    let decoded;
    try {
      decoded = await jwt.verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError('Invalid refresh token', 401);
    }

    // FIX (auditoria hallazgo alto #5): un refresh token revocado (por un
    // logout previo) no debe poder canjearse por un access token nuevo.
    if (await revokedTokensRepository.isRevoked(decoded.jti)) {
      throw new AppError('Invalid refresh token', 401);
    }

    const user = await usersRepository.findById(decoded.userId);
    if (!user) throw new AppError('User not found', 404);

    // FIX (auditoria hallazgo alto #2 - el refresh token no valida el
    // estado de la cuenta): antes, un usuario desactivado/suspendido DESPUÉS
    // de haber emitido su refresh token (que dura 7 días) podía seguir
    // renovando access tokens válidos indefinidamente, ignorando por
    // completo el bloqueo. Se aplican aquí las mismas reglas que ya rigen
    // el login.
    if (user.status === 'INACTIVE' || user.status === 'SUSPENDED') {
      throw new AppError('User account is inactive', 403);
    }
    if (usersRepository.isLocked(user)) {
      throw new AppError('Account locked due to too many failed login attempts. Try again later.', 423);
    }

    // SEGURIDAD (medio M6): un cambio de contraseña invalida todas las
    // sesiones anteriores — cualquier refresh token emitido ANTES del cambio
    // (iat anterior a password_changed_at) se rechaza aquí.
    if (user.password_changed_at && decoded.iat) {
      const changedAtMs = new Date(user.password_changed_at).getTime();
      if (decoded.iat * 1000 < changedAtMs) {
        throw new AppError('Invalid refresh token', 401);
      }
    }

    // FIX (segunda pasada, MEDIO #4): activar 2FA también invalida las
    // sesiones previas — un refresh token emitido antes de habilitar el
    // segundo factor no debe poder seguir renovando access tokens.
    if (user.twofa_enabled && user.twofa_enabled_at && decoded.iat) {
      const enabledAtMs = new Date(user.twofa_enabled_at).getTime();
      if (decoded.iat * 1000 < enabledAtMs) {
        throw new AppError('Invalid refresh token', 401);
      }
    }

    // Endurecimiento adicional (rotación de refresh token): cada canje
    // consume el refresh token usado y entrega uno nuevo. Así, un refresh
    // token robado solo sirve una vez — en cuanto el dueño legítimo (o el
    // atacante) lo usa, el otro queda revocado en el siguiente intento, lo
    // que además delata el robo (dos "primeros usos" del mismo token no
    // pueden suceder). FIX (segunda pasada, MEDIO #5): el insert atómico es
    // la propia compuerta — 0 filas insertadas significa que este refresh
    // token ya fue canjeado por una petición concurrente.
    const claimed = await revokedTokensRepository.revoke({
      jti: decoded.jti,
      userId: decoded.userId,
      tokenType: 'refresh',
      expiresAt: new Date(decoded.exp * 1000)
    });
    if (!claimed) {
      throw new AppError('Invalid refresh token', 401);
    }

    const roles = await usersRepository.getRoles(user.id);
    const permissions = await usersRepository.getPermissions(user.id);

    const payload = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      roles: roles.map(r => r.name),
      permissions: permissions.map(p => `${p.module}.${p.action}`),
      branches: [user.branch_id].filter(Boolean)
    };

    const accessToken = await jwt.signAccessToken(payload);
    const newRefreshToken = await jwt.signRefreshToken({ userId: user.id });
    return { accessToken, refreshToken: newRefreshToken };
  }
};

module.exports = AuthService;