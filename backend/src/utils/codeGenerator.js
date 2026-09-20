// FILE: backend/src/utils/codeGenerator.js
'use strict';

const crypto = require('crypto');

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

const DEFAULT_LENGTH = Number(process.env.GENERIC_CODE_LENGTH) || 8;

/**
 * Lightweight code generation utilities used across services.
 *
 * These are intended for human-friendly identifiers such as student codes,
 * enrollment numbers, reference codes, and similar values. They are not
 * cryptographically secure tokens for authentication.
 */

function randomInt(max) {
  if (max <= 0) {
    return 0;
  }

  const maxBigInt = BigInt(max);
  const maxBytes = BigInt(maxBigInt.toString(16).length * 1) + 1n;
  const bytesNeeded = Math.max(1, Math.ceil(Number(maxBytes) / 2));

  let value;
  do {
    const buf = crypto.randomBytes(bytesNeeded);
    value = BigInt('0x' + buf.toString('hex')) % maxBigInt;
  } while (value < 0n);

  return Number(value);
}

/**
 * Generate a random alphanumeric code.
 */
function alphanumeric(length = DEFAULT_LENGTH) {
  if (!Number.isFinite(length) || length < 1) {
    length = DEFAULT_LENGTH;
  }

  let result = '';
  const max = CHARSET.length;
  for (let i = 0; i < length; i++) {
    result += CHARSET[randomInt(max)];
  }
  return result;
}

/**
 * Generate a numeric string of fixed length (zero-padded).
 */
function numeric(length = 6) {
  if (!Number.isFinite(length) || length < 1) {
    length = 6;
  }

  const max = 10 ** length;
  let value = randomInt(max);
  const str = String(value).padStart(length, '0');
  return str.slice(-length);
}

/**
 * Generate a code with a prefix and a random suffix.
 *
 * Example: withPrefix('ALU', 6) -> "ALUx8fJ9a2"
 */
function withPrefix(prefix, length = DEFAULT_LENGTH) {
  if (!prefix) {
    return alphanumeric(length);
  }

  const suffix = alphanumeric(length);
  return `${prefix}${suffix}`;
}

/**
 * Generate a short numeric reference code that is zero-padded and
 * can be generated without DB coordination. Uniqueness beyond the
 * random space is not guaranteed.
 */
function numericRef(length = 6) {
  return numeric(length);
}

/**
 * Generate a batch of unique-ish codes. Duplicates are extremely unlikely
 * for short batches and typical lengths, but callers should still enforce
 * uniqueness in the database where required.
 */
function batchUnique(prefix, count, length = DEFAULT_LENGTH) {
  const generated = new Set();
  const codes = [];

  for (let i = 0; i < count; i++) {
    let code;
    let attempts = 0;
    do {
      code = withPrefix(prefix, length);
      attempts++;
      if (attempts > 50) {
        throw new Error('Unable to generate unique codes in reasonable attempts');
      }
    } while (generated.has(code));

    generated.add(code);
    codes.push(code);
  }

  return codes;
}

// ---------------------------------------------------------------------------
// Códigos secuenciales de negocio (`PREFIX-AAAA-NNNNNN`)
// ---------------------------------------------------------------------------

/**
 * Mapa prefijo -> tabla. Se usa para comprobar que el código generado no
 * choque con uno ya existente antes de devolverlo.
 *
 * FIX (QA — CRÍTICO: "crear" fallaba con 500 en los módulos principales):
 *   Antes `generateCode` sólo leía/incrementaba `code_sequences` y devolvía el
 *   número sin comprobar la tabla destino. Los seeds insertaron códigos con el
 *   MISMO formato (users -> USR-2026-000001, students -> STU-2026-000001, ...)
 *   sin crear sus filas en `code_sequences`; por tanto la primera llamada
 *   devolvía 1 y generaba un código ya ocupado:
 *       Duplicate entry 'USR-2026-000001' for key 'uniq_users_code'
 *   El error salía como 500 y hacía imposible crear usuarios, estudiantes,
 *   docentes, sedes, materias, años académicos, etc. desde la interfaz.
 *   Ahora el número se avanza hasta encontrar un código libre en la tabla real
 *   (incluyendo filas con borrado lógico, porque el índice UNIQUE no las
 *   excluye).
 */
const PREFIX_TABLES = {
  AHI: 'academic_history',
  APR: 'academic_periods',
  ASN: 'academic_assignments',
  ATT: 'attendance_records',
  AYR: 'academic_years',
  BRC: 'branches',
  CAL: 'school_calendar',
  CRE: 'credits',
  DOC: 'documents',
  GPA: 'gpa_records',
  GRA: 'grade_records',
  GRD: 'graduation_records',
  GRN: 'gransif_records',
  GUA: 'guardians',
  MED: 'medical_records',
  PRM: 'permissions',
  PSC: 'previous_schools',
  REP: 'reports',
  REQ: 'grade_change_requests',
  ROL: 'roles',
  SCH: 'scholarships',
  STU: 'students',
  SUB: 'subjects',
  TEA: 'teachers',
  TRN: 'transcripts',
  USR: 'users',
};

/** Formatea un número de secuencia como `PREFIX-AAAA-NNNNNN`. */
function formatCode(prefix, year, number) {
  return `${prefix}-${year}-${String(number).padStart(6, '0')}`;
}

/**
 * Reserva ATÓMICAMENTE el siguiente número de secuencia de un prefijo.
 *
 * Se ejecuta dentro de una transacción con `SELECT ... FOR UPDATE`, de modo
 * que dos peticiones concurrentes nunca obtienen el mismo número (el enfoque
 * anterior hacía lectura y escritura por separado: dos creaciones simultáneas
 * podían leer el mismo valor y chocar).
 *
 * @param {import('knex').Knex} db
 * @param {string} prefix
 * @param {number} year
 * @returns {Promise<number>} el número reservado
 */
async function reserveSequenceNumber(db, prefix, year) {
  return db.transaction(async (trx) => {
    const existing = await trx('code_sequences')
      .where({ prefix })
      .forUpdate()
      .first();

    if (!existing) {
      // INSERT ... ON DUPLICATE KEY UPDATE deja la creación a prueba de carreras.
      await trx.raw(
        `INSERT INTO code_sequences (prefix, last_number, year, created_at, updated_at)
         VALUES (?, 1, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE last_number = last_number + 1, updated_at = NOW()`,
        [prefix, year]
      );
      const row = await trx('code_sequences').where({ prefix }).first();
      return Number(row.last_number);
    }

    if (Number(existing.year) !== Number(year)) {
      // Año nuevo: la secuencia se reinicia.
      await trx('code_sequences').where({ prefix }).update({ last_number: 1, year });
      return 1;
    }

    await trx('code_sequences').where({ prefix }).increment('last_number', 1);
    return Number(existing.last_number) + 1;
  });
}

/**
 * Genera el código secuencial de negocio para un módulo, en el formato
 * `${prefix}-${año}-${secuencia a 6}` (p. ej. STU-2026-000001).
 *
 * Garantiza que el código devuelto NO exista ya en la tabla destino:
 * si el número reservado está ocupado (caso típico tras un seed o un
 * borrado lógico), sigue avanzando hasta encontrar uno libre.
 *
 * @param {string} prefix - P. ej. 'STU' | 'USR' | 'DOC'
 * @param {object} [options]
 * @param {number} [options.maxAttempts=50] - máximo de números a probar
 * @returns {Promise<string>}
 */
async function generateCode(prefix = 'GEN', options = {}) {
  const db = require('../config/database');
  const year = new Date().getFullYear();
  const normalizedPrefix = String(prefix).toUpperCase().slice(0, 10);
  const table = PREFIX_TABLES[normalizedPrefix];
  const maxAttempts = Number(options.maxAttempts) || 50;

  // Si no hay tabla mapeada, se conserva el comportamiento secuencial simple.
  if (!table) {
    const number = await reserveSequenceNumber(db, normalizedPrefix, year);
    return formatCode(normalizedPrefix, year, number);
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const number = await reserveSequenceNumber(db, normalizedPrefix, year);
    const candidate = formatCode(normalizedPrefix, year, number);

    // El índice UNIQUE de `code` no excluye las filas con borrado lógico,
    // así que la comprobación se hace sin filtrar por deleted_at.
    // eslint-disable-next-line no-await-in-loop
    const taken = await db(table).where({ code: candidate }).first();

    if (!taken) {
      return candidate;
    }
  }

  // Salida de emergencia: sufijo aleatorio manteniendo el formato del sistema.
  return `${normalizedPrefix}-${year}-${numeric(6)}`;
}

module.exports = {
  alphanumeric,
  numeric,
  withPrefix,
  numericRef,
  batchUnique,
  generateCode,
  formatCode,
  PREFIX_TABLES,
  DEFAULT_LENGTH,
};
