'use strict';

/**
 * FIX (bitácora 2026-09-15): este módulo era un no-op declarado ("stub ... so
 * the app starts") y nadie lo montaba. Mientras tanto NINGUNA ruta GET pasa
 * por `validate`, así que los validadores `findAll` que limitan `pageSize` a
 * 100 son código muerto: en el log hay decenas de `?pageSize=1000` respondidos
 * con 200. Tal como está, un cliente puede pedir `?pageSize=999999` y volcar
 * la tabla completa — problema de rendimiento y de exposición de datos a la
 * vez.
 *
 * Se acota en vez de rechazar: devolver 400 rompería los selectores de los
 * formularios, que hoy piden 1000 registros a propósito. `page` nunca baja de
 * 1 para que un `page=0` o `page=-5` no produzca un OFFSET negativo.
 */

const MAX_PAGE_SIZE = 1000;

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

function clampPagination(req, res, next) {
  if (req.method !== 'GET' || !req.query) return next();

  const query = { ...req.query };
  let touched = false;

  const clampKey = (key, fallback) => {
    if (query[key] === undefined) return;
    // Siempre se normaliza a número: así los servicios pueden hacer
    // (page - 1) * pageSize sin arrastrar cadenas.
    query[key] = Math.min(toPositiveInt(query[key], fallback), MAX_PAGE_SIZE);
    touched = true;
  };

  clampKey('pageSize', 20);
  clampKey('limit', 20);

  if (query.page !== undefined) {
    query.page = toPositiveInt(query.page, 1);
    touched = true;
  }

  if (touched) {
    // En Express 5 `req.query` es un getter: hay que redefinir la propiedad,
    // no se puede asignar.
    Object.defineProperty(req, 'query', {
      value: query,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }

  return next();
}

module.exports = { clampPagination, MAX_PAGE_SIZE };
