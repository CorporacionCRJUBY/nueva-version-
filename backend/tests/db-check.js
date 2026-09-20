'use strict';

// Script auxiliar: comprueba si la base de datos está disponible y sale con
// código 0 (sí) o 1 (no). Lo usa smoke.test.js para decidir si los tests que
// dependen de BD se ejecutan o se marcan como skipped.

const mysql = require('mysql2/promise');
const env = require('../src/config/env');

(async () => {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      connectTimeout: 2000,
    });
    await conn.query('SELECT 1');
    process.exit(0);
  } catch (err) {
    process.exit(1);
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
})();