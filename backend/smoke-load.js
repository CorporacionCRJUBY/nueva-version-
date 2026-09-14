'use strict';

/**
 * Smoke load del backend ACADEMIX.
 *
 * 1. Requiere TODOS los módulos de src/ (config, controllers, i18n, jobs,
 *    middleware, models, repositories, routes, services, utils, validators)
 *    para detectar errores de sintaxis / imports rotos en el arranque.
 * 2. Verifica que cada import desestructurado (const { a, b } = require(...))
 *    apunte a exports que existen de verdad en el módulo destino — la clase
 *    de bug que rompió auth (jwt.sign), auditoría (auditService.log), 2FA
 *    (twoFactor.buildOtpAuthUrl), scoping (branchScope) y generación de
 *    códigos (generateCode).
 * 3. Chequea rápidamente que JWT y TOTP produzcan valores coherentes.
 *
 * Sale con código != 0 si algo falla. Lo usa `npm run verify`.
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');

let failures = 0;

function fail(message) {
  failures++;
  console.error(`  ✗ ${message}`);
}

/* ---------- 1. Cargar todos los módulos ---------- */
console.log('[smoke-load] Cargando módulos de src/...');
const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      walk(path.join(dir, entry.name));
    } else if (entry.name.endsWith('.js')) {
      files.push(path.join(dir, entry.name));
    }
  }
})(SRC);

for (const file of files) {
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    require(file);
  } catch (error) {
    fail(`${path.relative(SRC, file)}: ${error.message.split('\n')[0]}`);
  }
}

/* ---------- 2. Verificar imports desestructurados ---------- */
console.log('[smoke-load] Verificando imports desestructurados...');
const exportCache = new Map();

function getExports(absolutePath) {
  if (exportCache.has(absolutePath)) {
    return exportCache.get(absolutePath);
  }
  exportCache.set(absolutePath, []);
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const mod = require(absolutePath);
    const keys = mod && typeof mod === 'object' ? Object.keys(mod) : [];
    exportCache.set(absolutePath, keys);
    return keys;
  } catch (error) {
    exportCache.set(absolutePath, []);
    return [];
  }
}

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const pattern = /const\s*\{([^}]*)\}\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    const spec = match[2];
    if (!spec.startsWith('.')) continue;

    // Nombre real de cada miembro: maneja `a as b` y `a: b` (renames).
    const names = match[1]
      .split(',')
      .map((s) => {
        const trimmed = s.trim();
        const asSplit = trimmed.split(/\s+as\s+/);
        const base = asSplit.length > 1 ? asSplit[0] : trimmed.split(':')[0];
        return base.trim();
      })
      .filter(Boolean);

    const target = path.resolve(path.dirname(file), spec);
    const exported = getExports(target);
    for (const name of names) {
      if (!exported.includes(name)) {
        fail(`"${name}" no existe en ${path.relative(SRC, target)} (usado en ${path.relative(SRC, file)})`);
      }
    }
  }
}

/* ---------- 3. Sanity de JWT y TOTP ---------- */
console.log('[smoke-load] Sanity de JWT y TOTP...');
(async () => {
  try {
    const jwt = require('./src/config/jwt');
    const twoFactor = require('./src/utils/twoFactor');

    const access = await jwt.signAccessToken({ id: 1 });
    const decoded = await jwt.verifyAccessToken(access);
    if (!decoded.jti || decoded.type !== 'access') {
      fail('JWT access token sin jti/type válidos');
    }

    const challenge = await jwt.signTwoFactorChallenge({ userId: 1 });
    await jwt.verifyTwoFactorChallenge(challenge);

    const secret = twoFactor.generateSecret();
    const code = twoFactor.generateTOTP(secret);
    if (!twoFactor.verifyTOTP(secret, code)) {
      fail('TOTP no verifica su propio código');
    }
  } catch (error) {
    fail(`JWT/TOTP: ${error.message}`);
  }

  if (failures === 0) {
    console.log('[smoke-load] OK — todos los módulos cargan y las interfaces cuadran.');
    process.exit(0);
  } else {
    console.error(`[smoke-load] ${failures} fallo(s).`);
    process.exit(1);
  }
})();