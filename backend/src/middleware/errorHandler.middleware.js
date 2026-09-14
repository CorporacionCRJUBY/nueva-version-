'use strict';

const logger = require('../utils/logger');
const AppError = require('../utils/AppError');
const config = require('../config/env');

/**
 * Central error-handling middleware for ACADEMIX.
 *
 * This middleware must be registered after all route handlers.
 *
 * FIX (QA — errores de base de datos devolvían 500 en lugar del código HTTP
 * correcto): hasta ahora, cualquier error de MySQL (clave duplicada, clave
 * foránea inexistente, dato demasiado largo) se propagaba como 500 "Internal
 * server error". Para el funcionario que usa el sistema eso significaba un
 * mensaje incomprensible, y para el soporte, ninguna pista. Ahora los errores
 * conocidos del motor se traducen a un estado HTTP semántico (409/400/404/422)
 * con un mensaje claro en el idioma de la petición.
 */

/** Traduce un error del driver MySQL/MariaDB a un AppError con estado HTTP. */
function translateDatabaseError(err) {
  const code = err && err.code;

  switch (code) {
    case 'ER_DUP_ENTRY': {
      // Se extrae el valor duplicado del mensaje del motor para que el usuario
      // sepa QUE campo ya existe ("Duplicate entry 'USR-2026-000001' for key ...").
      const match = /Duplicate entry '([^']+)' for key '([^']+)'/.exec(err.sqlMessage || '');
      const duplicated = match ? match[1] : null;
      const key = match ? match[2] : null;
      return new AppError(
        duplicated
          ? `Ya existe un registro con el valor «${duplicated}»${key ? ` (${key})` : ''}.`
          : 'Ya existe un registro con esos datos.',
        409,
        { code: 'DUPLICATE_ENTRY', details: { value: duplicated, key } }
      );
    }
    case 'ER_NO_REFERENCED_ROW':
    case 'ER_NO_REFERENCED_ROW_2':
      return new AppError('El registro referencia un dato que no existe (clave foránea no válida).', 400, {
        code: 'FOREIGN_KEY_VIOLATION',
      });
    case 'ER_ROW_IS_REFERENCED':
    case 'ER_ROW_IS_REFERENCED_2':
      return new AppError('No se puede eliminar: el registro tiene datos relacionados.', 409, {
        code: 'ROW_IS_REFERENCED',
      });
    case 'ER_DATA_TOO_LONG':
      return new AppError('Uno de los valores enviados es más largo de lo permitido.', 400, {
        code: 'DATA_TOO_LONG',
      });
    case 'ER_TRUNCATED_WRONG_VALUE':
    case 'ER_WRONG_VALUE_FOR_TYPE':
      return new AppError('Uno de los valores enviados tiene un formato inválido.', 400, {
        code: 'INVALID_VALUE',
      });
    case 'ER_BAD_NULL_ERROR':
      return new AppError('Falta un campo obligatorio.', 400, { code: 'MISSING_FIELD' });
    case 'ECONNREFUSED':
    case 'PROTOCOL_CONNECTION_LOST':
    case 'ER_CON_COUNT_ERROR':
      return new AppError('La base de datos no está disponible en este momento.', 503, {
        code: 'DATABASE_UNAVAILABLE',
      });
    case 'ETIMEDOUT':
      return new AppError('La operación excedió el tiempo de espera.', 504, { code: 'TIMEOUT' });
    default:
      return null;
  }
}

function errorHandler(err, req, res, next) {
  // Errores de multer (tamaño, campos, archivos) son 4xx, no 500.
  let status = err.statusCode || err.status || 500;
  if (err && err.name === 'MulterError') {
    status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
  }

  // Errores de validación de express-validator ya vienen formateados
  if (err && err.name === 'ValidationError') {
    status = 400;
  }

  // Errores conocidos del motor de base de datos -> estado semántico.
  const translated = translateDatabaseError(err);
  if (translated && (!err.statusCode || err.statusCode === 500)) {
    err = Object.assign(translated, {
      // Se conserva el error original para el log (nunca para la respuesta).
      cause: { code: err.code, sqlMessage: err.sqlMessage },
    });
    status = err.statusCode;
  }

  const isProd = config.NODE_ENV === 'production';
  const message = isProd && status >= 500 ? 'Internal server error' : err.message || 'Internal server error';

  if (err instanceof AppError || status < 500) {
    logger.warn(`[AppError] ${status} - ${message} - ${req.method} ${req.originalUrl}`);
  } else {
    logger.error(`[Error] ${status} - ${message} - ${req.method} ${req.originalUrl}`);
    if (!isProd && err.stack) {
      logger.debug(err.stack);
    }
  }

  const responseBody = {
    success: false,
    error: {
      message,
      status,
    },
  };

  if (err.code) {
    responseBody.error.code = err.code;
  }

  if (err.details) {
    responseBody.error.details = err.details;
  }

  if (!isProd && err.stack) {
    responseBody.error.stack = err.stack;
  }

  res.status(status).json(responseBody);
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      message: 'Not found',
      status: 404,
    },
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
  translateDatabaseError,
};
