'use strict';

/**
 * FIX (bitácora de pruebas 2026-09-15): la mayoría de los 400 "Validation
 * failed" del log no eran datos malos del usuario, sino campos OPCIONALES que
 * el formulario manda como cadena vacía.
 *
 *   POST /api/medical-records  -> last_checkup_date: ""   -> 400
 *   PUT  /api/graduation/1     -> certificate_number: ""  -> 400
 *   PUT  /api/attendance/232   -> check_in_time: ""       -> 400
 *   PUT  /api/academic-periods/1 -> grading_config: null  -> 400
 *
 * En React un <TextField> vacío vale "" (nunca undefined) y un registro que
 * viene de la BD trae null en las columnas sin valor. `optional()` de
 * express-validator, en cambio, solo salta `undefined`, así que "" y null
 * entraban a `isISO8601()` / `isInt()` / `isObject()` y reventaban.
 *
 * Este middleware normaliza el contrato de entrada en un solo punto: "" (y
 * cadenas que solo son espacios) significa "sin valor" -> null. Junto con
 * `optional({ values: 'null' })` en los validadores, un campo opcional vacío
 * ahora se salta la validación y llega a la BD como NULL, que es lo correcto.
 *
 * Importante: NO toca 0, false ni arrays/objetos vacíos — esos son valores
 * legítimos (peso 0, requirements_met false, records: []).
 */

const MAX_DEPTH = 6;

function normalizeValue(value, depth) {
  if (typeof value === 'string') {
    return value.trim() === '' ? null : value;
  }

  if (depth >= MAX_DEPTH || value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      value[i] = normalizeValue(value[i], depth + 1);
    }
    return value;
  }

  // Buffers, fechas y demás objetos especiales se dejan intactos.
  if (value instanceof Date || Buffer.isBuffer(value)) {
    return value;
  }

  for (const key of Object.keys(value)) {
    value[key] = normalizeValue(value[key], depth + 1);
  }
  return value;
}

function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    normalizeValue(req.body, 0);
  }
  next();
}

module.exports = { sanitizeBody, normalizeValue };
