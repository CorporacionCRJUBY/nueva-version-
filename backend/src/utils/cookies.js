'use strict';

const crypto = require('crypto');

/**
 * Cookie helpers for the auth flow.
 *
 * This module only handles cookie metadata and signing helpers. It does not
 * itself write headers; Express cookie middleware is responsible for that.
 */

const ACCESS_TOKEN_COOKIE = process.env.ACCESS_TOKEN_COOKIE || 'accessToken';
const REFRESH_TOKEN_COOKIE = process.env.REFRESH_TOKEN_COOKIE || 'refreshToken';

function cookieName() {
  return ACCESS_TOKEN_COOKIE;
}

function refreshCookieName() {
  return REFRESH_TOKEN_COOKIE;
}

function isProd() {
  return process.env.NODE_ENV === 'production';
}

/**
 * ¿La cookie de sesión debe llevar el atributo `Secure`?
 *
 * FIX (bug que impedía iniciar sesión en el stack Docker):
 *   Antes esto era `secure: isProd()`. Con `NODE_ENV=production` la cookie se
 *   marcaba SIEMPRE `Secure`, pero el stack de docker-compose sirve nginx por
 *   HTTP (sin TLS). Un navegador DESCARTA en silencio una cookie `Secure`
 *   recibida por HTTP: el login devolvía 200 y el usuario seguía siendo
 *   anónimo. El README y los `.env` documentaban COOKIE_SECURE, pero el código
 *   nunca lo leía, así que el ajuste no tenía ningún efecto.
 *
 *   Ahora COOKIE_SECURE es la fuente de verdad:
 *     COOKIE_SECURE=true   -> exige servir por HTTPS (despliegue real)
 *     COOKIE_SECURE=false  -> HTTP local / demostración
 *   Si no está definida se conserva el comportamiento seguro anterior
 *   (`Secure` en producción).
 */
function cookieSecure() {
  const raw = process.env.COOKIE_SECURE;
  if (raw === undefined || raw === null || raw === '') return isProd();
  return raw === 'true' || raw === '1' || raw === 'yes';
}

function cookieOptions(overrides = {}) {
  const base = {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: isProd() ? 'strict' : 'lax',
    path: '/',
    ...overrides,
  };

  if (overrides.sameSite === undefined) {
    base.sameSite = isProd() ? 'strict' : 'lax';
  }

  return base;
}

function accessCookieOptions() {
  const maxAge = Number(process.env.ACCESS_TOKEN_COOKIE_MAX_AGE) || 15 * 60 * 1000;
  return cookieOptions({
    maxAge,
    signed: false,
  });
}

function refreshCookieOptions() {
  const maxAge = Number(process.env.REFRESH_TOKEN_COOKIE_MAX_AGE) || 7 * 24 * 60 * 1000;
  return cookieOptions({
    maxAge,
    signed: false,
  });
}

function clearCookieOptions() {
  return {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: isProd() ? 'strict' : 'lax',
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  };
}

/**
 * Escribe las cookies httpOnly del par access/refresh en la respuesta.
 * Es la ÚNICA vía por la que los tokens salen del backend (nunca en el
 * body JSON — ver auth.controller.js).
 */
function setAuthCookies(res, { accessToken, refreshToken } = {}) {
  if (accessToken) {
    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, accessCookieOptions());
  }
  if (refreshToken) {
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, refreshCookieOptions());
  }
}

/**
 * Borra ambas cookies de sesión (logout o refresh fallido).
 */
function clearAuthCookies(res) {
  res.clearCookie(ACCESS_TOKEN_COOKIE, clearCookieOptions());
  res.clearCookie(REFRESH_TOKEN_COOKIE, clearCookieOptions());
}

/**
 * Create a simple HMAC signature for cookie integrity checks.
 * Not a replacement for Express signed cookies, but useful for custom tokens.
 */
function signCookieValue(value, secret) {
  const payload = Buffer.from(String(value), 'utf8');
  const sig = crypto.createHmac('sha256', String(secret)).update(payload).digest('base64url');
  return `${value}.${sig}`;
}

function verifyCookieValue(signedValue, secret) {
  if (typeof signedValue !== 'string') {
    return null;
  }

  const idx = signedValue.lastIndexOf('.');
  if (idx === -1) {
    return null;
  }

  const value = signedValue.slice(0, idx);
  const providedSig = signedValue.slice(idx + 1);

  const expectedSig = crypto.createHmac('sha256', String(secret)).update(Buffer.from(value, 'utf8')).digest('base64url');

  // SEGURIDAD: comparación de firmas en tiempo constante. `!==` sobre
  // strings compara byte a byte y corta en el primer carácter distinto,
  // filtrando por temporización cuánto de la firma esperada acertó un
  // atacante (side channel clásico contra HMACs). timingSafeEqual exige
  // buffers del mismo tamaño; si difieren, ya sabemos que no coincide sin
  // necesidad de compararlos (y sin ramificar según el contenido).
  const providedBuf = Buffer.from(providedSig);
  const expectedBuf = Buffer.from(expectedSig);
  if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
    return null;
  }

  return value;
}

module.exports = {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  cookieName,
  refreshCookieName,
  cookieOptions,
  accessCookieOptions,
  refreshCookieOptions,
  clearCookieOptions,
  setAuthCookies,
  clearAuthCookies,
  signCookieValue,
  verifyCookieValue,
};
