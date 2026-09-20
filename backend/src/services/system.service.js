'use strict';

/**
 * Servicio de control del servidor (Server Control Panel).
 *
 * Expone métricas del sistema operativo (CPU, memoria, disco, uptime, carga),
 * estado de "servicios" (procesos del sistema / contenedores) y acceso a los
 * logs de la aplicación. Todo es de SOLO LECTURA salvo el reinicio de
 * servicios, que está protegido por rol y por un flag de entorno.
 *
 * Diseñado para ser seguro: no ejecuta comandos arbitrarios del usuario;
 * solo usa el módulo `os` de Node y, para el reinicio, un comando fijo y
 * controlado (SIGTERM al propio proceso o `docker compose restart` si se
 * configura explícitamente).
 */

const os = require('os');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const logger = require('../utils/logger');

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

/** Convierte bytes a una representación legible (B, KB, MB, GB, TB). */
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 2)} ${units[unit]}`;
}

/** Formatea un uptime (segundos) a días/horas/minutos. */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return { days, hours, minutes, seconds: secs, raw: seconds };
}

/** Lee el uso de disco de una ruta (raíz por defecto) vía statfs. */
function getDiskUsage(targetPath = '/') {
  try {
    const stats = fs.statfsSync(targetPath);
    const total = stats.blocks * stats.bsize;
    const free = stats.bfree * stats.bsize;
    const used = total - free;
    return {
      total,
      free,
      used,
      usedPercent: total > 0 ? Math.round((used / total) * 1000) / 10 : 0,
      mount: targetPath,
    };
  } catch (error) {
    return { total: 0, free: 0, used: 0, usedPercent: 0, mount: targetPath, error: error.message };
  }
}

// ---------------------------------------------------------------------------
// Métricas de CPU (con cálculo de uso porcentual entre dos muestras)
// ---------------------------------------------------------------------------

let cpuTimesLast = null;

function readCpuTimes() {
  const cpus = os.cpus();
  if (!cpus || cpus.length === 0) return null;
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    for (const type of Object.keys(cpu.times)) {
      total += cpu.times[type];
    }
    idle += cpu.times.idle;
  }
  return { idle, total, cores: cpus.length };
}

/**
 * Calcula el uso de CPU como porcentaje. La primera llamada devuelve el uso
 * instantáneo aproximado; las siguientes, el uso medio entre llamadas.
 */
function getCpuUsage() {
  const current = readCpuTimes();
  if (!current) return { percent: 0, cores: 0, model: 'unknown' };

  let percent = 0;
  if (cpuTimesLast) {
    const idleDelta = current.idle - cpuTimesLast.idle;
    const totalDelta = current.total - cpuTimesLast.total;
    if (totalDelta > 0) {
      percent = Math.round(((totalDelta - idleDelta) / totalDelta) * 1000) / 10;
    }
  }
  cpuTimesLast = current;

  const model = os.cpus()[0]?.model || 'unknown';
  return { percent, cores: current.cores, model };
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Métricas completas del sistema.
 */
function getSystemMetrics() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const loadAvg = os.loadavg();
  const cpu = getCpuUsage();
  const disk = getDiskUsage();

  return {
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    platform: `${os.type()} ${os.release()}`,
    arch: os.arch(),
    nodeVersion: process.version,
    process: {
      pid: process.pid,
      uptime: process.uptime(),
      memory: {
        rss: process.memoryUsage().rss,
        heapTotal: process.memoryUsage().heapTotal,
        heapUsed: process.memoryUsage().heapUsed,
        external: process.memoryUsage().external,
      },
    },
    cpu: {
      percent: cpu.percent,
      cores: cpu.cores,
      model: cpu.model,
      loadAvg1: loadAvg[0],
      loadAvg5: loadAvg[1],
      loadAvg15: loadAvg[2],
    },
    memory: {
      total: totalMem,
      free: freeMem,
      used: usedMem,
      usedPercent: totalMem > 0 ? Math.round((usedMem / totalMem) * 1000) / 10 : 0,
    },
    disk,
    uptime: formatUptime(os.uptime()),
    osUptime: os.uptime(),
  };
}

/**
 * Estado de los "servicios" del sistema. En un despliegue Docker esto
 * refleja los contenedores; en un despliegue simple, el proceso del backend
 * y la conexión a BD.
 */
async function getServicesStatus() {
  const services = [];

  // Backend (este proceso)
  services.push({
    name: 'backend',
    label: 'ACADEMIX API',
    status: 'running',
    pid: process.pid,
    uptime: process.uptime(),
    port: process.env.PORT || 5000,
  });

  // Base de datos (MySQL) — se comprueba vía la conexión de knex si está disponible
  try {
    const db = require('../config/database');
    await db.raw('SELECT 1');
    services.push({
      name: 'database',
      label: 'MySQL Database',
      status: 'running',
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
    });
  } catch (error) {
    services.push({
      name: 'database',
      label: 'MySQL Database',
      status: 'down',
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
      error: error.message,
    });
  }

  // Frontend (nginx en Docker) — se infiere del entorno
  const isDocker = fs.existsSync('/.dockerenv');
  services.push({
    name: 'frontend',
    label: 'Frontend (Web UI)',
    status: isDocker ? 'running' : 'n/a',
    note: isDocker ? 'Served by nginx container' : 'Served by Vite dev server',
  });

  return services;
}

// Cuánto del archivo se lee como máximo cuando es grande: de sobra para 500
// líneas salvo entradas gigantescas, y evita cargar un log de varios MB entero
// en memoria solo para quedarse con la cola.
const LOG_TAIL_BYTES = 512 * 1024;

/**
 * Lee las últimas líneas del log de la aplicación.
 *
 * FIX (bitácora 2026-09-15, pendiente "926 ms en /activity y /grades"): esto
 * era `fs.readFileSync` sobre el archivo COMPLETO seguido de un `split('\n')`
 * sobre todo su contenido. Node es de un solo hilo: mientras el panel de
 * sistema pedía los logs, ninguna otra petición en curso avanzaba, y un
 * `app.log` de varios MB (algo normal tras días de uso) puede bloquear el
 * event loop el tiempo suficiente como para explicar picos como los del log.
 * Ahora la lectura es asíncrona y, si el archivo es grande, solo se lee la
 * cola en bytes (no el archivo entero) antes de partirlo en líneas.
 *
 * @param {number} lines - número de líneas a devolver (máx 500)
 */
async function getLogs(lines = 200) {
  const maxLines = Math.min(Math.max(Number(lines) || 200, 1), 500);
  const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
  const logFile = path.join(logDir, 'app.log');

  try {
    const stats = await fsp.stat(logFile).catch(() => null);
    if (!stats) {
      return { file: logFile, lines: [], message: 'Log file not found yet' };
    }

    let content;
    if (stats.size > LOG_TAIL_BYTES) {
      const fd = await fsp.open(logFile, 'r');
      try {
        const start = stats.size - LOG_TAIL_BYTES;
        const buffer = Buffer.alloc(LOG_TAIL_BYTES);
        await fd.read(buffer, 0, LOG_TAIL_BYTES, start);
        // La primera línea del recorte puede venir cortada a la mitad: se
        // descarta para no mostrar una entrada de log truncada.
        content = buffer.toString('utf8').split('\n').slice(1).join('\n');
      } finally {
        await fd.close();
      }
    } else {
      content = await fsp.readFile(logFile, 'utf8');
    }

    const allLines = content.split('\n').filter((l) => l.trim() !== '');
    const tail = allLines.slice(-maxLines);
    return { file: logFile, lines: tail, total: allLines.length };
  } catch (error) {
    return { file: logFile, lines: [], error: error.message };
  }
}

/**
 * Reinicia un servicio. Por defecto solo permite reiniciar el backend
 * (envía SIGTERM al proceso actual, que el server.js maneja con un cierre
 * ordenado). En Docker, si RESTART_SERVICE_CMD está definido, se ejecuta ese
 * comando (p. ej. `docker compose restart backend`).
 * @param {string} service - nombre del servicio a reiniciar
 */
async function restartService(service) {
  const allowed = ['backend', 'all'];
  if (!allowed.includes(service)) {
    const error = new Error(`Service "${service}" is not restartable`);
    error.status = 400;
    throw error;
  }

  const restartCmd = process.env.SYSTEM_RESTART_CMD;
  if (restartCmd) {
    // Modo Docker: ejecutar el comando de reinicio configurado
    try {
      const { stdout, stderr } = await execAsync(restartCmd, { timeout: 15000 });
      logger.info(`[system] Servicio "${service}" reiniciado vía comando: ${stdout || stderr}`);
      return { success: true, service, method: 'command', output: stdout || stderr };
    } catch (error) {
      logger.error(`[system] Error al reiniciar "${service}": ${error.message}`);
      const err = new Error(`No se pudo reiniciar "${service}": ${error.message}`);
      err.status = 500;
      throw err;
    }
  }

  // Modo local: reiniciar el proceso actual con SIGTERM (cierre ordenado)
  logger.info(`[system] Reiniciando backend (SIGTERM al PID ${process.pid})`);
  // Pequeño retraso para que la respuesta llegue al cliente antes de morir
  setTimeout(() => {
    process.kill(process.pid, 'SIGTERM');
  }, 500);

  return { success: true, service, message: 'Reinicio iniciado (SIGTERM)', pid: process.pid };
}

module.exports = {
  getSystemMetrics,
  getServicesStatus,
  getLogs,
  restartService,
  formatBytes,
  formatUptime,
};