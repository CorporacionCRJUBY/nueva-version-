'use strict';

// FILE: backend/src/routes/system.routes.js
// Panel de control del servidor. Solo accesible para administradores
// (SUPER_ADMIN o ADMIN). Las métricas y logs son de solo lectura; el
// reinicio de servicios está además protegido por rol.

const express = require('express');
const router = express.Router();
const controller = require('../controllers/system.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Métricas del sistema (CPU, memoria, disco, uptime)
router.get('/metrics', authorize('system.view'), controller.getMetrics);

// Estado de servicios
router.get('/services', authorize('system.view'), controller.getServices);

// Logs de la aplicación
router.get('/logs', authorize('system.view'), controller.getLogs);

// Reiniciar un servicio (solo administradores)
router.post('/restart', authorize('system.manage'), controller.restartService);

module.exports = router;