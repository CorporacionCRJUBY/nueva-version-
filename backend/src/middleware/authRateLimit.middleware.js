// FILE: backend/src/middleware/authRateLimit.middleware.js
'use strict';

/**
 * Limitador de peticiones para los endpoints de autenticación.
 *
 * ── Problema real que resuelve este diseño ─────────────────────────────────
 * Un colegio navega habitualmente tras **una sola IP pública** (NAT). Con una
 * clave por IP, todo el profesorado comparte el mismo contador: unos pocos
 * inicios de sesión simultáneos a primera hora bloquean a los demás, y basta
 * un usuario escribiendo mal su contraseña para dejar fuera a toda la
 * institución.
 *
 * ── Diseño ────────────────────────────────────────────────────────────────
 * La clave del contador es la **cuenta** (email normalizado) cuando está
 * presente; solo se recurre a la IP como respaldo (p. ej. peticiones sin
 * cuerpo, como /refresh, que van con cookie). Así:
 *   · un usuario solo puede agotar SU propio cupo,
 *   · el resto de la escuela no se ve afectado,
 *   · se sigue mitigando la fuerza bruta por cuenta, que es la amenaza real.
 *
 * `skipSuccessfulRequests: true` evita penalizar los inicios de sesión
 * correctos (incluido el sondeo de sesión del frontend).
 *
 * La IP de respaldo se normaliza a su prefijo /64 en IPv6 para que un cliente
 * no pueda eludir el límite rotando dentro de su propio bloque.
 */

const rateLimit = require('express-rate-limit');
const net = require('net');
const env = require('../config/env');

/**
 * Reduce una dirección IPv6 a su prefijo /64 (la unidad asignada a un cliente).
 * Las IPv4 y los valores ya mapeados se devuelven tal cual.
 */
function normalizeIp(ip) {
  if (!ip || typeof ip !== 'string') return 'unknown';

  // Formas mapeadas de IPv4: ::ffff:1.2.3.4
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return mapped[1];

  if (net.isIPv4(ip)) return ip;

  if (net.isIPv6(ip)) {
    const expanded = ip.split('%')[0]; // sin identificador de zona
    const halves = expanded.split('::');
    const head = halves[0] ? halves[0].split(':') : [];
    const tail = halves.length > 1 && halves[1] ? halves[1].split(':') : [];
    const missing = 8 - (head.length + tail.length);
    const full = halves.length > 1 ? [...head, ...Array(Math.max(0, missing)).fill('0'), ...tail] : head;
    // Los 4 primeros grupos (64 bits) identifican la red del cliente.
    return `${full.slice(0, 4).join(':')}::/64`;
  }

  return ip;
}

/** Clave del contador: la cuenta si la conocemos; si no, la red del cliente. */
function accountOrIpKey(req) {
  const email = req?.body?.email;
  if (typeof email === 'string' && email.trim() !== '') {
    return `acct:${email.trim().toLowerCase()}`;
  }
  return `ip:${normalizeIp(req?.ip)}`;
}

const authRateLimitMiddleware = rateLimit({
  windowMs: Number(env.AUTH_RATE_LIMIT_WINDOW_MS) || 60000,
  max: Number(env.AUTH_RATE_LIMIT_MAX) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: accountOrIpKey,
  message: {
    success: false,
    error: {
      message: 'Too many authentication requests, please try again later.',
      status: 429,
    },
  },
  // Un inicio de sesión correcto no consume cupo.
  skipSuccessfulRequests: true,
});

module.exports = authRateLimitMiddleware;
module.exports.normalizeIp = normalizeIp;
