// FILE: backend/src/app.js
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const config = require('./config/env');
const db = require('./config/database');
const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler.middleware');
const { rateLimiter } = require('./middleware/rateLimit.middleware');
const { sanitizeBody } = require('./middleware/sanitizeBody.middleware');
const { clampPagination } = require('./middleware/pagination.middleware');
const logger = require('./utils/logger');

// Inicializar express
const app = express();

// Middlewares de seguridad
// FIX (auditoria hallazgo bajo #3 - endurecimiento de cabeceras): Helmet
// venía con su CSP por defecto (pensada para apps que sirven HTML/JS/CSS
// propios) y `crossOriginResourcePolicy: "cross-origin"`, que permite que
// CUALQUIER origen cargue las respuestas de esta API sin restricción
// (relevante sobre todo para los endpoints que devuelven archivos —
// documentos, boletines, fotos, transcripts; ver los comentarios más abajo
// sobre `/uploads`). Esta API nunca sirve HTML ni renderiza nada por sí
// misma: solo responde JSON y streams de archivo binarios detrás de
// endpoints autenticados/RBAC, consumidos por el frontend vía
// fetch/XHR con CORS (ver cors() arriba) y convertidos a blob URLs — nunca
// vía <img src>, <script src> ni iframes de terceros.
//   - default-src 'none' / frame-ancestors 'none': no hay ningún recurso
//     legítimo que este servidor deba cargar o en el que deba embeberse.
//   - crossOriginResourcePolicy 'same-site': solo el propio front (mismo
//     sitio registrable que la API, típicamente incluso el mismo dominio)
//     puede consumir estas respuestas sin pasar por CORS explícito; un
//     tercero que intente hotlinkear un documento/foto vía <img>/<script>
//     ya no puede, aunque conozca la URL exacta.
// Si en el futuro algún módulo necesita servir contenido embebible por un
// origen externo legítimo (ej. un widget público), debe relajarse aquí de
// forma explícita y documentada para ESE módulo, no globalmente.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'same-site' },
}));

// CORS
// NOTA DE SEGURIDAD: origin: '*' junto con credentials: true es una combinación
// inválida/insegura (los navegadores la rechazan para requests con credenciales,
// y si algún cliente la aceptara sería un CORS completamente abierto con cookies/
// tokens). CORS_ORIGIN ahora es obligatorio en producción; en desarrollo cae a
// localhost. Ver .env.example para configurarlo con la URL real del frontend.
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : (config.NODE_ENV === 'development' ? 'http://localhost:5173' : false);

if (!corsOrigin && config.NODE_ENV !== 'development') {
  logger.warn('CORS_ORIGIN no está configurado en producción — todas las peticiones cross-origin serán rechazadas.');
}

app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Compresión
app.use(compression());

// FIX (auditoria hallazgo medio #2 - JWT en localStorage): los tokens
// ahora viajan como cookies httpOnly (ver utils/cookies.js), así que la
// app necesita poder leerlas en `req.cookies`.
app.use(cookieParser());

// Rate limiting
app.use(rateLimiter);

// Logging
if (config.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// Body parsers
// FIX (auditoria hallazgo bajo #1 - límite de body JSON muy alto): antes
// 50mb fijo para cualquier request JSON/urlencoded, muy por encima de lo
// que necesita cualquier endpoint real de esta API (los uploads de
// archivos van por multer/multipart, no por aquí — ver
// middleware/upload.middleware.js). Ver config/env.js#JSON_BODY_LIMIT.
app.use(express.json({ limit: config.JSON_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: config.JSON_BODY_LIMIT }));

// FIX (bitácora 2026-09-15): los formularios mandan "" en los campos
// opcionales vacíos y eso rompía la validación (400 "Validation failed" en
// medical-records, graduation, attendance, grades...). Aquí "" pasa a null,
// que es lo que los validadores tratan como "campo ausente".
// Ver middleware/sanitizeBody.middleware.js.
app.use(sanitizeBody);

// Acota page/pageSize/limit en las lecturas: las rutas GET no pasan por
// `validate`, así que sin esto `?pageSize=999999` volcaba la tabla entera.
app.use(clampPagination);

// NOTA DE SEGURIDAD: NO servir /uploads como carpeta estática pública.
// Antes había un `app.use('/uploads', express.static(...))` aquí, lo que permitía
// descargar cualquier archivo (documentos de estudiantes, boletines, fotos) con
// solo conocer la URL, sin autenticación ni RBAC. Todo archivo ahora se sirve
// exclusivamente a través de endpoints autenticados y protegidos por permisos:
//   GET /api/documents/:id/download
//   GET /api/report-cards/:id/preview , /api/progress-reports/:id/preview,
//   /api/transcripts/:id/preview , /api/reports/:id/preview
//   GET /api/students/:id/photo

// Health check
// SEGURIDAD (bajo B9): la raíz ya no revela versión ni rutas de docs; para
// un anónimo basta con saber que el servicio responde.
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'ACADEMIX API is running'
  });
});

// Health check detallado para orquestadores (Docker/K8s) y monitoreo.
// - /health/live  -> el proceso responde (liveness)
// - /health/ready -> además la BD responde (readiness)
// Ambos están exentos del rate limiter global (ver rateLimit.middleware.js).
app.get('/health/live', (req, res) => {
  res.json({ success: true, status: 'ok', uptime: process.uptime() });
});

app.get('/health/ready', async (req, res) => {
  try {
    await db.raw('SELECT 1');
    res.json({ success: true, status: 'ok', db: 'up' });
  } catch (error) {
    res.status(503).json({ success: false, status: 'unavailable', db: 'down' });
  }
});

// API routes
app.use('/api', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handler central
app.use(errorHandler);

module.exports = app;