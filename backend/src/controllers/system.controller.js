'use strict';

/**
 * Controlador del panel de control del servidor (Server Control Panel).
 * Expone métricas del sistema, estado de servicios, logs y reinicio.
 * Todas las rutas requieren autenticación y rol de administrador.
 */

const systemService = require('../services/system.service');
const logger = require('../utils/logger');

/**
 * GET /api/system/metrics
 * Métricas completas del sistema (CPU, memoria, disco, uptime, carga).
 */
async function getMetrics(req, res, next) {
  try {
    const metrics = systemService.getSystemMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/system/services
 * Estado de los servicios (backend, base de datos, frontend).
 */
async function getServices(req, res, next) {
  try {
    const services = await systemService.getServicesStatus();
    res.json({ success: true, data: services });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/system/logs?lines=200
 * Últimas líneas del log de la aplicación.
 */
async function getLogs(req, res, next) {
  try {
    const lines = Number(req.query.lines) || 200;
    const logs = systemService.getLogs(lines);
    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/system/restart
 * Reinicia un servicio (por defecto el backend). Body: { service: 'backend' }.
 */
async function restartService(req, res, next) {
  try {
    const service = req.body?.service || 'backend';
    const result = await systemService.restartService(service);
    logger.info(`[system] Reinicio solicitado por ${req.user?.id || 'unknown'} para "${service}"`);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMetrics,
  getServices,
  getLogs,
  restartService,
};