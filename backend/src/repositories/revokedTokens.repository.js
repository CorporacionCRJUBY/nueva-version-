'use strict';

const db = require('../config/database');

// Esquema real (migraciones 053 + 058):
//   id          int unsigned PK
//   jti         varchar(36)  NOT NULL UNIQUE  <- claim jti del JWT
//   user_id     int unsigned NULL (FK users.id)
//   token_type  enum('access','refresh','2fa_challenge') NOT NULL
//   expires_at  timestamp NOT NULL
//   created_at  timestamp
const TABLE = 'revoked_tokens';

const DEFAULT_REVOCATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// La conexión usa `dateStrings: true` (config/database.js), así que las
// columnas timestamp llegan como 'YYYY-MM-DD HH:mm:ss' SIN zona horaria,
// interpretadas como UTC (timezone 'Z'). `new Date('YYYY-MM-DD HH:mm:ss')`
// las parsearía como hora LOCAL y la comparación con `now` se desvía por
// el offset del servidor — por eso se fuerza UTC explícitamente.
function toUtcDate(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  const str = String(value).replace(' ', 'T');
  const parsed = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(str)
    ? new Date(str + 'Z')
    : new Date(str);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// La tabla la crean las migraciones; `init` se conserva como no-op por
// compatibilidad (nadie debe crear esquemas a mano).
async function init() {
  return Promise.resolve();
}

/**
 * Registra un token como revocado. La columna `jti` es UNIQUE, así que el
 * insert funciona como compuerta atómica: si el jti ya estaba revocado (o
 * un token con el mismo jti se canjeó/revocó primero) devuelve false.
 *
 * @param {object} params
 * @param {string} params.jti - Claim jti del token
 * @param {number|null} [params.userId]
 * @param {'access'|'refresh'|'2fa_challenge'} [params.tokenType]
 * @param {Date|number|string|null} [params.expiresAt] - exp del token
 * @returns {Promise<boolean>} true si se insertó, false si ya existía
 */
async function revoke({ jti, userId = null, tokenType = 'access', expiresAt = null } = {}) {
  if (!jti) {
    return false;
  }

  const expires = expiresAt
    ? new Date(expiresAt)
    : new Date(Date.now() + DEFAULT_REVOCATION_TTL_MS);

  try {
    const result = await db(TABLE).insert({
      jti: String(jti),
      user_id: userId || null,
      token_type: tokenType,
      expires_at: expires,
    });
    return Array.isArray(result) ? result[0] > 0 : true;
  } catch (error) {
    // jti duplicado = ya revocado/canjeado. Cualquier otro error se propaga.
    if (error && (error.code === 'ER_DUP_ENTRY' || /duplicate/i.test(error.message))) {
      return false;
    }
    throw error;
  }
}

/**
 * Busca por jti (el claim del token, no el token completo).
 * @param {string} jti
 */
async function findById(jti) {
  if (!jti) {
    return null;
  }
  return db(TABLE).where({ jti: String(jti) }).first() || null;
}

/**
 * true si el jti está revocado y aún vigente; si la revocación expiró,
 * limpia la fila y devuelve false.
 * @param {string} jti
 */
async function isRevoked(jti) {
  if (!jti) {
    return false;
  }

  const row = await findById(jti);
  if (!row) {
    return false;
  }

  const expiresAt = toUtcDate(row.expires_at);
  if (expiresAt && expiresAt < new Date()) {
    await db(TABLE).where({ id: row.id }).del();
    return false;
  }

  return true;
}

/**
 * Elimina todas las revocaciones de un usuario (y opcionalmente de un tipo).
 * @param {number} userId
 * @param {object} [options]
 * @param {string} [options.type] - 'access' | 'refresh' | '2fa_challenge'
 */
async function revokeForUser(userId, options = {}) {
  const query = db(TABLE).where({ user_id: userId });
  if (options.type) {
    query.andWhere({ token_type: options.type });
  }

  const deleted = await query.del();
  return { revokedCount: deleted || 0 };
}

async function cleanExpired() {
  const now = new Date();
  return db(TABLE).where('expires_at', '<', now).del();
}

module.exports = {
  init,
  revoke,
  findById,
  isRevoked,
  revokeForUser,
  cleanExpired,
  TABLE,
};