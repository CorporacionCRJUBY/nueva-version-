'use strict';

const knex = require('knex');
const config = require('./env');

const poolConfig = {
  min: config.DB_POOL_MIN || 2,
  max: config.DB_POOL_MAX || 10,
  idleTimeoutMillis: 30000,
  acquireTimeoutMillis: 30000,
  createTimeoutMillis: 30000,
};

const db = knex({
  client: 'mysql2',
  connection: {
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
    timezone: 'Z',
    dateStrings: true,
    // Evita que la conexión se caiga por inactividad (MySQL wait_timeout)
    // manteniendo el pool saludable en entornos de larga duración (Docker).
    connectTimeout: 30000,
  },
  pool: poolConfig,
  acquireConnectionTimeout: 30000,
  ...(config.NODE_ENV === 'development'
    ? {
        log: {
          warn: (msg) => console.warn('[DB WARN]', msg),
          error: (msg) => console.error('[DB ERR]', msg),
        },
      }
    : {}),
});

module.exports = db;