'use strict';

const path = require('path');
const dotenv = require('dotenv');

const nodeEnv = process.env.NODE_ENV || 'development';

const envFile = nodeEnv === 'production'
  ? '.env.production'
  : nodeEnv === 'test'
    ? '.env.test'
    : '.env';

const basePath = path.resolve(process.cwd(), envFile);

try {
  if (nodeEnv !== 'production' && nodeEnv !== 'test') {
    dotenv.config({ path: basePath });
  }
} catch (error) {
  // ignore missing env files in non-critical environments
}

const toBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return value === 'true' || value === '1' || value === 'yes';
};

const toHopCount = (value) => {
  // `trust proxy` de Express debe ser un NUMERO DE SALTOS, nunca `true`:
  // con `true`, Express toma `req.ip` de X-Forwarded-For y un cliente puede
  // inventarse una IP distinta en cada peticion, desactivando de hecho todos
  // los limites de peticiones por IP. 0 = expuesto directamente.
  if (value === undefined || value === null || value === '') return 0;
  if (value === 'true') return 1; // compatibilidad: el booleano antiguo -> 1 salto
  if (value === 'false') return 0;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : 0;
};

const toNumber = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const env = {
  NODE_ENV: nodeEnv,
  PORT: toNumber(process.env.PORT, 5000),
  HOST: process.env.HOST || '0.0.0.0',

  // Express `trust proxy`: NUMERO DE SALTOS de proxy de confianza.
  // 0 = expuesto directamente (Express ignora X-Forwarded-For);
  // 1 = hay exactamente un reverse-proxy delante (nginx en docker-compose).
  TRUST_PROXY: toHopCount(process.env.TRUST_PROXY),

  DB_HOST: process.env.DB_HOST || '127.0.0.1',
  DB_PORT: toNumber(process.env.DB_PORT, 3306),
  DB_USER: process.env.DB_USER || 'ADMIN',
  // Sin valor por defecto: la contrasena vive SOLO en el entorno/.env.
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME || 'academix_v2',
  DB_DIALECT: process.env.DB_DIALECT || 'mysql',
  DB_POOL_MIN: toNumber(process.env.DB_POOL_MIN, 2),
  DB_POOL_MAX: toNumber(process.env.DB_POOL_MAX, 10),

  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || '',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  BCRYPT_ROUNDS: toNumber(process.env.BCRYPT_ROUNDS, 12),

  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || process.env.CRYPTO_KEY || '',
  CRYPTO_KEY: process.env.CRYPTO_KEY || process.env.ENCRYPTION_KEY || '',

  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  CORS_ORIGINS: process.env.CORS_ORIGINS || '',

  RATE_LIMIT_MAX: toNumber(process.env.RATE_LIMIT_MAX, 600),
  RATE_LIMIT_WINDOW_MS: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 60000),

  AUTH_RATE_LIMIT_MAX: toNumber(process.env.AUTH_RATE_LIMIT_MAX, 10),
  AUTH_RATE_LIMIT_WINDOW_MS: toNumber(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 60000),

  ACCESS_TOKEN_COOKIE: process.env.ACCESS_TOKEN_COOKIE || 'accessToken',
  REFRESH_TOKEN_COOKIE: process.env.REFRESH_TOKEN_COOKIE || 'refreshToken',
  ACCESS_TOKEN_COOKIE_MAX_AGE: toNumber(process.env.ACCESS_TOKEN_COOKIE_MAX_AGE, 900000),
  REFRESH_TOKEN_COOKIE_MAX_AGE: toNumber(process.env.REFRESH_TOKEN_COOKIE_MAX_AGE, 604800000),

  TWO_FACTOR_ENABLED: toBool(process.env.TWO_FACTOR_ENABLED),
  TWO_FACTOR_ISSUER: process.env.TWO_FACTOR_ISSUER || 'ACADEMIX',
  TWO_FACTOR_PERIOD: toNumber(process.env.TWO_FACTOR_PERIOD, 30),

  MAILGUN_API_KEY: process.env.MAILGUN_API_KEY || '',
  MAILGUN_DOMAIN: process.env.MAILGUN_DOMAIN || '',
  MAIL_FROM: process.env.MAIL_FROM || 'no-reply@academix.local',

  UPLOAD_DIR: process.env.UPLOAD_DIR || '',
  FILE_STORAGE_DIR: process.env.FILE_STORAGE_DIR || '',

  // Límite de tamaño para uploads por multer (bytes).
  UPLOAD_MAX_SIZE_BYTES: toNumber(process.env.UPLOAD_MAX_SIZE_BYTES, 0),
  MAX_FILE_SIZE_BYTES: toNumber(process.env.MAX_FILE_SIZE_BYTES, 0),

  LOG_LEVEL: process.env.LOG_LEVEL || (nodeEnv === 'production' ? 'info' : 'debug'),
  LOG_DATE_FORMAT: process.env.LOG_DATE_FORMAT || 'YYYY-MM-DD HH:mm:ss',

  // Límite de body para JSON/urlencoded (los uploads van por multer, no por aquí).
  JSON_BODY_LIMIT: process.env.JSON_BODY_LIMIT || '1mb',

  // Tiempo máximo (ms) de espera para el cierre ordenado del servidor.
  SHUTDOWN_TIMEOUT_MS: toNumber(process.env.SHUTDOWN_TIMEOUT_MS, 10000),
};

// ---------------------------------------------------------------------------
// Validación estricta en producción: si faltan secretos críticos, abortamos
// en lugar de arrancar con una configuración insegura.
// ---------------------------------------------------------------------------
const missing = [];

if (nodeEnv === 'production') {
  if (!env.JWT_SECRET) missing.push('JWT_SECRET');
  if (!env.JWT_REFRESH_SECRET) missing.push('JWT_REFRESH_SECRET');
  if (!env.ENCRYPTION_KEY) missing.push('ENCRYPTION_KEY');
  if (!env.DB_PASSWORD) missing.push('DB_PASSWORD');
  if (!env.CORS_ORIGIN || env.CORS_ORIGIN === '*') missing.push('CORS_ORIGIN (no puede ser "*" en producción)');

  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error(
      `[FATAL] Faltan variables de entorno obligatorias en producción: ${missing.join(', ')}`
    );
    process.exit(1);
  }
} else {
  if (!env.JWT_SECRET) {
    // eslint-disable-next-line no-console
    console.warn(
      '[WARN] JWT_SECRET is not configured. ' +
      'The server will start, but authentication will be insecure.'
    );
  }
}

module.exports = env;