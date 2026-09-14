// FILE: backend/src/server.js
'use strict';

const app = require('./app');
const config = require('./config/env');
const db = require('./config/database');
const { startJobs } = require('./jobs');
const logger = require('./utils/logger');

const PORT = config.PORT || 5000;
const HOST = config.HOST || '0.0.0.0';

// `trust proxy` viene de TRUST_PROXY (config/env.js). false por defecto:
// si el servidor está expuesto directamente, Express ignora X-Forwarded-For
// y los rate limiters no se pueden evadir falsificando ese header.
app.set('trust proxy', config.TRUST_PROXY);

// Tiempo máximo (ms) que esperamos a que el servidor drene conexiones antes
// de forzar el cierre. Configurable vía env para entornos con conexiones
// largas (uploads, streams de PDF).
const SHUTDOWN_TIMEOUT_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS) || 10000;

let server = null;
let jobs = null;
let shuttingDown = false;

/**
 * Verifica la conexión a la base de datos con reintentos (útil en Docker,
 * donde el contenedor de la BD puede tardar unos segundos en estar listo).
 */
async function waitForDatabase(retries = 10, delayMs = 3000) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await db.raw('SELECT 1');
      logger.info('✅ Conexión a base de datos establecida');
      return true;
    } catch (error) {
      lastError = error;
      logger.warn(
        `⏳ Intento ${attempt}/${retries} de conexión a BD fallido: ${error.message}`
      );
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  logger.error('❌ No se pudo conectar a la base de datos tras varios intentos');
  throw lastError;
}

/**
 * Cierre ordenado del servidor: detiene jobs, cierra HTTP y libera la BD.
 */
const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`\n📴 Recibida señal ${signal}, cerrando servidor...`);

  // 1) Detener jobs programados para que ningún cron siga escribiendo en BD
  try {
    if (jobs && typeof jobs.stopAll === 'function') {
      jobs.stopAll();
      logger.info('✅ Jobs programados detenidos');
    }
  } catch (err) {
    logger.error('❌ Error al detener jobs:', err);
  }

  // 2) Cerrar el servidor HTTP (deja de aceptar conexiones nuevas)
  const closeHttp = () =>
    new Promise((resolve) => {
      if (!server) return resolve();
      server.close((err) => {
        if (err) logger.error('❌ Error al cerrar servidor HTTP:', err);
        else logger.info('✅ Servidor HTTP cerrado');
        resolve();
      });
    });

  try {
    await Promise.race([
      closeHttp(),
      new Promise((resolve) => setTimeout(resolve, SHUTDOWN_TIMEOUT_MS)),
    ]);
  } catch (err) {
    logger.error('❌ Error durante el cierre HTTP:', err);
  }

  // 3) Cerrar la conexión a BD
  try {
    await db.destroy();
    logger.info('✅ Conexión a base de datos cerrada');
  } catch (err) {
    logger.error('❌ Error al cerrar base de datos:', err);
  }

  process.exit(0);
};

/**
 * Inicializa el servidor
 */
const startServer = async () => {
  try {
    // Verificar conexión a base de datos (con reintentos para Docker)
    await waitForDatabase();

    // Iniciar jobs programados
    jobs = startJobs();
    logger.info('✅ Jobs programados iniciados');

    // Iniciar servidor
    server = app.listen(PORT, HOST, () => {
      logger.info(`🚀 Servidor ejecutándose en http://${HOST}:${PORT}`);
      logger.info(`📁 Entorno: ${config.NODE_ENV}`);
      logger.info(`🕐 ${new Date().toISOString()}`);
    });

    // Manejo de señales de terminación
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Manejo de errores no capturados
    process.on('uncaughtException', (error) => {
      logger.error('❌ Excepción no capturada:', error);
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('❌ Promesa rechazada no manejada:', reason);
      shutdown('unhandledRejection');
    });

    return server;
  } catch (error) {
    logger.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Solo iniciar si no estamos en modo test
if (require.main === module) {
  startServer();
}

module.exports = { startServer, shutdown };