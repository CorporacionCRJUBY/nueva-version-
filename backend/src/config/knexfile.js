// FILE: backend/src/config/knexfile.js
//
// Configuración de Knex (cliente mysql2) para migraciones y seeds.
//
// FIX (QA — el contenedor no arrancaba):
//   Las rutas de `migrations.directory` y `seeds.directory` eran relativas
//   ('../../../database/...'). Knex las resuelve contra el directorio desde el
//   que se ejecuta el CLI, y en la imagen Docker el árbol es /app/src/config,
//   de modo que tres niveles arriba apuntaban a la RAÍZ del contenedor ('/')
//   en lugar de a '/app' — el backend fallaba con:
//       Error: ENOENT: no such file or directory, scandir '/database/migrations'
//   y el contenedor entraba en bucle de reinicio.
//
//   Solución robusta para ambos entornos (desarrollo y Docker): resolverlas de
//   forma ABSOLUTA a partir de `__dirname`, que es estable en los dos casos.
//     · desarrollo: backend/src/config -> ../../../ = raíz del repo  ✓
//     · Docker:     /app/src/config     -> ../../../ = /app           ✓
//   Se permite además sobreescribir con DB_MIGRATIONS_DIR / DB_SEEDS_DIR.

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Localiza la raíz del proyecto buscando hacia ARRIBA el directorio que
 * contiene `database/migrations`.
 *
 * ¿Por qué no una ruta relativa fija? Porque la profundidad cambia según el
 * entorno y una constante no sirve para ambos:
 *   · desarrollo: backend/src/config  -> raíz del repo (sube 3)
 *   · Docker:     /app/src/config     -> /app          (sube 2)
 * Buscar el marcador es estable en los dos casos y sobrevive a reestructurar
 * carpetas en el futuro.
 */
function findProjectRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 6; i += 1) {
    if (
      fs.existsSync(path.join(dir, 'database', 'migrations')) ||
      fs.existsSync(path.join(dir, 'database', 'seeds'))
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break; // raíz del sistema de archivos
    dir = parent;
  }
  // Último recurso: tres niveles arriba (comportamiento previo en desarrollo).
  return path.resolve(startDir, '../../..');
}

const PROJECT_ROOT = process.env.PROJECT_ROOT
  ? path.resolve(process.env.PROJECT_ROOT)
  : findProjectRoot(__dirname);

const MIGRATIONS_DIR = process.env.DB_MIGRATIONS_DIR
  ? path.resolve(process.env.DB_MIGRATIONS_DIR)
  : path.join(PROJECT_ROOT, 'database', 'migrations');

const SEEDS_DIR = process.env.DB_SEEDS_DIR
  ? path.resolve(process.env.DB_SEEDS_DIR)
  : path.join(PROJECT_ROOT, 'database', 'seeds');

/** Conexión a la base de datos (misma forma en todos los entornos). */
function buildConnection() {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'ADMIN',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'academix_v2',
    charset: 'utf8mb4',
  };
}

/** Configuración compartida por todos los entornos. */
function buildConfig() {
  return {
    client: 'mysql2',
    connection: buildConnection(),
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    },
    migrations: {
      directory: MIGRATIONS_DIR,
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: SEEDS_DIR,
    },
  };
}

module.exports = {
  development: buildConfig(),
  test: buildConfig(),
  production: buildConfig(),
};
