'use strict';

const db = require('../config/database');

// Esquema real (migración 009):
//   id, student_id, from_status, to_status, reason, observation,
//   changed_by, created_at
const TABLE = 'student_status_history';

// La tabla la crean las migraciones; se conserva el init como no-op por
// compatibilidad.
async function createTableIfNotExists() {
  return Promise.resolve();
}

async function findByStudent(studentId) {
  return db(TABLE)
    .where({ student_id: studentId })
    .orderBy('created_at', 'desc');
}

// Alias usado por consumidores externos (findByStudentId era la API vieja).
async function findByStudentId(studentId) {
  return findByStudent(studentId);
}

/**
 * Inserta un cambio de estado.
 * @param {object} params
 * @param {number} params.student_id
 * @param {string} [params.from_status] - estado anterior (enum)
 * @param {string} params.to_status - estado nuevo (enum)
 * @param {string} [params.reason]
 * @param {string} [params.observation]
 * @param {number} params.changed_by - id del usuario
 */
async function create(params) {
  const record = {
    student_id: params.student_id,
    from_status: params.from_status || null,
    to_status: params.to_status,
    reason: params.reason || null,
    observation: params.observation || null,
    changed_by: params.changed_by,
  };
  const [id] = await db(TABLE).insert(record);
  return db(TABLE).where({ id }).first();
}

// Compatibilidad con la API vieja (createRecord({studentId, status, ...})).
async function createRecord(params) {
  return create({
    student_id: params.studentId,
    from_status: params.fromStatus || null,
    to_status: params.status,
    reason: params.reason || null,
    observation: params.observation || null,
    changed_by: params.changedBy || null,
  });
}

async function latestByStudentId(studentId) {
  return db(TABLE).where({ student_id: studentId }).orderBy('created_at', 'desc').first();
}

module.exports = {
  createTableIfNotExists,
  findByStudent,
  findByStudentId,
  create,
  createRecord,
  latestByStudentId,
  TABLE,
};