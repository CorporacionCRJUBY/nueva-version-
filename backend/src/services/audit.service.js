'use strict';

const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const AuditModel = require('../models/audit.model');

const TABLE = 'audit_logs';

/**
 * Normaliza el actor de una acción de auditoría. Acepta:
 *  - el objeto `req.user` completo ({ id, email, ... })
 *  - `{ id: <userId> }`
 *  - `null` (acciones del sistema, p. ej. jobs programados)
 */
function normalizeUserId(user) {
  if (!user) {
    return null;
  }
  if (typeof user === 'object' && 'id' in user) {
    return user.id ?? null;
  }
  return user ?? null;
}

function ipFromReq(req) {
  if (!req) return null;
  return (req.ip || req.connection?.remoteAddress || null);
}

function userAgentFromReq(req) {
  if (!req) return null;
  return (req.headers && req.headers['user-agent']) || null;
}

/**
 * Escribe una entrada en audit_logs. Nunca lanza: si la auditoría falla se
 * registra en el logger y la operación de negocio continúa (un fallo de
 * logging no debe romper un create/update/login ya completado).
 *
 * @param {object} params
 * @param {object|null} params.user - Actor ({ id } o req.user) o null
 * @param {string} params.action - p. ej. 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN'
 * @param {string} params.module - p. ej. 'students' | 'auth'
 * @param {string} [params.recordCode] - Código del registro afectado
 * @param {object} [params.before]
 * @param {object} [params.after]
 * @param {string} [params.reason]
 * @param {object} [params.req] - Request para extraer ip / user-agent
 * @returns {Promise<boolean>}
 */
// FIX (bitácora 2026-09-15): `PUT /api/settings` dejaba "[audit.service]
// Failed to write audit log:" en cada guardado. `before`/`after` son columnas
// JSON y settings.service pasaba ARRAYS de filas; knex serializa un objeto a
// JSON, pero un array lo expande como lista de valores SQL ("a, b, c"), así
// que el INSERT era sintácticamente inválido. Se serializa aquí, una sola vez,
// para que cualquier módulo pueda pasar objetos, arrays o texto sin pensarlo.
function toJsonColumn(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch (error) {
    return JSON.stringify({ unserializable: String(error && error.message) });
  }
}

// user_agent es VARCHAR(255): una cadena más larga provocaba ER_DATA_TOO_LONG
// y tiraba la auditoría entera de esa acción.
function truncate(value, max) {
  if (typeof value !== 'string') return value;
  return value.length > max ? value.slice(0, max) : value;
}

async function log({ user, action, module, recordCode, before, after, reason, req } = {}) {
  try {
    const row = {
      user_id: normalizeUserId(user),
      action: action || 'UNKNOWN',
      module: module || 'system',
      record_code: recordCode || null,
      before: toJsonColumn(before),
      after: toJsonColumn(after),
      reason: reason || null,
      ip: truncate(ipFromReq(req), 45),
      user_agent: truncate(userAgentFromReq(req), 255),
    };

    await AuditModel.create(row);
    return true;
  } catch (error) {
    // El logger ignoraba el segundo argumento, así que en el log salía
    // "Failed to write audit log:" sin ninguna pista de la causa.
    logger.error(
      `[audit.service] Failed to write audit log (${module || 'system'}/${action || 'UNKNOWN'}): ` +
        `${error && error.message ? error.message : error}`
    );
    return false;
  }
}

/**
 * Lista paginada para la consola de auditoría.
 * @returns {Promise<{data: Array, total: number, page: number, pageSize: number}>}
 */
async function findAll(filters = {}, user) {
  const page = Number(filters.page) || 1;
  const pageSize = Number(filters.pageSize) || 20;

  const queryFilters = {
    search: filters.search,
    userId: filters.userId,
    module: filters.module,
    action: filters.action,
    recordCode: filters.recordCode,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  };

  const [data, total] = await Promise.all([
    AuditModel.findAll({ ...queryFilters, page, pageSize }),
    AuditModel.count(queryFilters),
  ]);

  return { data, total, page, pageSize };
}

async function findById(id, user) {
  const record = await AuditModel.findById(id);
  if (!record) {
    throw new AppError('Audit record not found', 404);
  }
  return record;
}

async function findByRecordCode(recordCode, user) {
  return AuditModel.findByRecordCode(recordCode);
}

async function findByUser(userId, limit = 20) {
  return AuditModel.findByUser(userId, limit);
}

async function recent(limit = 25) {
  return AuditModel.findByUser
    ? AuditModel.findAll({ page: 1, pageSize: limit }).then((rows) => rows)
    : [];
}

// Compatibilidad con la API anterior (nada en el código la usa hoy, pero
// se conserva para no romper importadores externos).
async function logChange({
  action,
  entity,
  entityId,
  userId,
  oldValues,
  newValues,
  ipAddress,
  metadata,
}) {
  return log({
    user: { id: userId },
    action,
    module: entity,
    recordCode: entityId ? String(entityId) : null,
    before: oldValues,
    after: newValues,
    reason: metadata ? JSON.stringify(metadata) : null,
  });
}

async function logAction(action, entity, entityId, userId, metadata) {
  return logChange({
    action,
    entity,
    entityId,
    userId,
    metadata,
  });
}

module.exports = {
  log,
  findAll,
  findById,
  findByRecordCode,
  findByUser,
  recent,
  logChange,
  logAction,
  TABLE,
};