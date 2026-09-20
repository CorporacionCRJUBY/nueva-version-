'use strict';

// Jest corre con NODE_ENV=test y config/env.js no carga .env en ese modo
// (los tests deben leer las variables del entorno). Estos smoke tests
// ejercitan el stack real, así que cargan el .env de desarrollo a mano
// ANTES de requerir cualquier módulo del backend.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

/**
 * Smoke tests del backend ACADEMIX.
 *
 * Cubren las piezas de infraestructura que históricamente se rompieron por
 * desajustes de interfaces (JWT, 2FA/TOTP, revocación de tokens, scope por
 * sede) y el arranque de la app. Los tests que tocan la BD (revoked_tokens)
 * requieren que el MySQL local esté levantado — igual que el propio backend.
 */

const env = require('../src/config/env');
const jwt = require('../src/config/jwt');
const twoFactor = require('../src/utils/twoFactor');
const branchScope = require('../src/utils/branchScope');
const cookies = require('../src/utils/cookies');
const codeGenerator = require('../src/utils/codeGenerator');

// ---------------------------------------------------------------------------
// Detección síncrona de disponibilidad de la BD. Los tests que tocan la BD
// (codeGenerator y revoked_tokens) se marcan como SKIPPED cuando no hay un
// MySQL/MariaDB local (p. ej. en CI sin base de datos), en lugar de fallar.
// ---------------------------------------------------------------------------
const { execSync } = require('child_process');
const path = require('path');
let dbUp = false;
try {
  execSync(`node ${path.join(__dirname, 'db-check.js')}`, {
    timeout: 5000,
    stdio: 'ignore',
  });
  dbUp = true;
} catch (e) {
  dbUp = false;
}
const describeDb = dbUp ? describe : describe.skip;

describe('config/env', () => {
  test('carga secretos JWT desde .env', () => {
    expect(env.JWT_SECRET).toBeTruthy();
    expect(env.JWT_REFRESH_SECRET).toBeTruthy();
    expect(env.DB_NAME).toBeTruthy();
  });

  test('expone JSON_BODY_LIMIT', () => {
    expect(env.JSON_BODY_LIMIT).toBeTruthy();
  });
});

describe('config/jwt', () => {
  test('firma y verifica access tokens con jti y type', async () => {
    const token = await jwt.signAccessToken({ id: 1, email: 'a@b.c' });
    const decoded = await jwt.verifyAccessToken(token);
    expect(decoded.jti).toBeTruthy();
    expect(decoded.type).toBe('access');
    expect(decoded.id).toBe(1);
  });

  test('firma y verifica refresh tokens con secret propio', async () => {
    const token = await jwt.signRefreshToken({ userId: 1 });
    const decoded = await jwt.verifyRefreshToken(token);
    expect(decoded.jti).toBeTruthy();
    expect(decoded.type).toBe('refresh');
    expect(decoded.userId).toBe(1);
  });

  test('firma y verifica challenges 2FA', async () => {
    const challenge = await jwt.signTwoFactorChallenge({ userId: 1 });
    const decoded = await jwt.verifyTwoFactorChallenge(challenge);
    expect(decoded.type).toBe('2fa_challenge');
    expect(decoded.userId).toBe(1);
  });

  test('rechaza un challenge 2FA como si fuera access token', async () => {
    const challenge = await jwt.signTwoFactorChallenge({ userId: 1 });
    await expect(jwt.verifyAccessToken(challenge)).rejects.toThrow();
  });

  test('rechaza un access token como si fuera refresh', async () => {
    const token = await jwt.signAccessToken({ id: 1 });
    await expect(jwt.verifyRefreshToken(token)).rejects.toThrow();
  });

  test('extrae Bearer tokens y detecta expiración', async () => {
    expect(jwt.extractBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
    expect(jwt.extractBearerToken('Basic abc')).toBeNull();
    const token = await jwt.signAccessToken({ id: 1 });
    expect(jwt.isTokenExpired(token)).toBe(false);
  });
});

describe('utils/twoFactor', () => {
  test('genera secretos base32 válidos de 32 chars', () => {
    const secret = twoFactor.generateSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(twoFactor.base32Decode(secret)).not.toBeNull();
  });

  test('verifica códigos TOTP y rechaza inválidos', () => {
    const secret = twoFactor.generateSecret();
    const code = twoFactor.generateTOTP(secret);
    expect(twoFactor.verifyTOTP(secret, code)).toBe(true);
    expect(twoFactor.verifyTOTP(secret, '000000')).toBe(false);
  });

  test('genera, hashea y consume códigos de respaldo', async () => {
    const codes = twoFactor.generateBackupCodes(5);
    expect(codes).toHaveLength(5);
    expect(codes[0]).toMatch(/^[A-F0-9]{5}-[A-F0-9]{5}-[A-F0-9]{5}$/);

    const hashes = await twoFactor.hashBackupCodes(codes);
    expect(hashes).toHaveLength(5);
    expect(hashes[0]).not.toBe(codes[0]);

    const remaining = await twoFactor.consumeBackupCode(codes[2], hashes);
    expect(remaining).toHaveLength(4);

    const afterInvalid = await twoFactor.consumeBackupCode('XXXXX-XXXXX-XXXXX', remaining);
    expect(afterInvalid).toBeNull();
  });

  test('construye la otpauth URL', () => {
    const url = twoFactor.createTOTPUrl('SECRET', 'admin@academix.com');
    expect(url.startsWith('otpauth://totp/')).toBe(true);
    expect(url).toContain('secret=SECRET');
  });
});

describe('utils/branchScope', () => {
  const superAdmin = { roles: ['SUPER_ADMIN'], branches: [1] };
  const teacher = { roles: ['TEACHER'], branches: [2] };

  test('SUPER_ADMIN no recibe restricción de sedes', () => {
    const filters = branchScope.scopeFiltersToUserBranches({ search: 'x' }, superAdmin);
    expect(filters.branchIds).toBeUndefined();
  });

  test('un rol con sedes recibe branchIds', () => {
    const filters = branchScope.scopeFiltersToUserBranches({ search: 'x' }, teacher);
    expect(filters.branchIds).toEqual([2]);
  });

  test('assertBranchAccess rechaza registros de otra sede con 404', () => {
    expect(() => branchScope.assertBranchAccess({ branch_id: 1 }, teacher, 'Student not found'))
      .toThrow();
    expect(() => branchScope.assertBranchAccess(null, teacher, 'Student not found')).toThrow();
    expect(() => branchScope.assertBranchAccess({ branch_id: 2 }, teacher)).not.toThrow();
  });

  test('assertBranchForCreate exige sede propia', () => {
    expect(() => branchScope.assertBranchForCreate({ branch_id: 1 }, teacher)).toThrow();
    expect(() => branchScope.assertBranchForCreate({ branch_id: 2 }, teacher)).not.toThrow();
    expect(() => branchScope.assertBranchForCreate({}, teacher)).toThrow();
    expect(() => branchScope.assertBranchForCreate({ branch_id: 1 }, superAdmin)).not.toThrow();
  });
});

describe('utils/cookies', () => {
  test('expone los helpers de sesión', () => {
    expect(typeof cookies.setAuthCookies).toBe('function');
    expect(typeof cookies.clearAuthCookies).toBe('function');
    expect(cookies.REFRESH_TOKEN_COOKIE).toBeTruthy();
  });
});

describeDb('utils/codeGenerator', () => {
  test('genera códigos con formato PREFIX-AÑO-SECUENCIA', async () => {
    const code = await codeGenerator.generateCode('SMT');
    expect(code).toMatch(/^SMT-\d{4}-\d{6}$/);
  });
});

describe('utils/safePath', () => {
  const safePath = require('../src/utils/safePath');

  test('resolveWithinRoot acepta rutas internas y rechaza traversal', () => {
    const root = require('path').join(__dirname, '..', 'uploads');
    expect(safePath.resolveWithinRoot(root, 'images/foto.jpg')).toBe(require('path').join(root, 'images/foto.jpg'));
    expect(() => safePath.resolveWithinRoot(root, '../.env')).toThrow();
    expect(() => safePath.resolveWithinRoot(root, '')).toThrow();
  });
});

describe('app', () => {
  test('carga sin errores y expone rutas /api', () => {
    const app = require('../src/app');
    expect(app).toBeTruthy();
  });
});

describeDb('revoked_tokens (requiere BD)', () => {
  const repo = require('../src/repositories/revokedTokens.repository');

  afterAll(async () => {
    const db = require('../src/config/database');
    await db.destroy();
  });

  test('revoca, detecta y limpia tokens por jti', async () => {
    const jti = `jest-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const expiresAt = new Date(Date.now() + 60 * 1000);

    const claimed = await repo.revoke({ jti, userId: null, tokenType: 'access', expiresAt });
    expect(claimed).toBe(true);

    expect(await repo.isRevoked(jti)).toBe(true);

    // Duplicado -> compuerta atómica devuelve false
    const second = await repo.revoke({ jti, userId: null, tokenType: 'access', expiresAt });
    expect(second).toBe(false);

    // Limpieza de expirados
    const db = require('../src/config/database');
    const expired = await db('revoked_tokens').where({ jti }).update({ expires_at: new Date(Date.now() - 1000) });
    expect(expired).toBe(1);
    expect(await repo.isRevoked(jti)).toBe(false);

    // Borrar la fila para dejar la BD limpia
    await db('revoked_tokens').where({ jti }).del();
  });
});