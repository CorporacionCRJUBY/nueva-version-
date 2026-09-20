'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('./env');

const DEFAULT_ACCESS_EXPIRES_IN = '15m';
const DEFAULT_REFRESH_EXPIRES_IN = '7d';
const TWO_FACTOR_CHALLENGE_EXPIRES_IN = '5m';

const ACCESS_EXPIRES_IN = env.JWT_EXPIRES_IN || DEFAULT_ACCESS_EXPIRES_IN;
const REFRESH_EXPIRES_IN = env.JWT_REFRESH_EXPIRES_IN || DEFAULT_REFRESH_EXPIRES_IN;

// TOKEN_TYPE_* identifica el claim `type` que llevan los tokens. La tabla
// revoked_tokens.token_type espera exactamente estos valores
// (enum 'access' | 'refresh' | '2fa_challenge').
const TOKEN_TYPE_ACCESS = 'access';
const TOKEN_TYPE_REFRESH = 'refresh';
const TOKEN_TYPE_TWO_FACTOR_CHALLENGE = '2fa_challenge';

function getAccessTokenSecret() {
  const secret = env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
}

function getRefreshTokenSecret() {
  const secret = env.JWT_REFRESH_SECRET || env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET or JWT_SECRET is not configured');
  }
  return secret;
}

/**
 * Cada token lleva un jti (uuid) único: es la clave con la que
 * revoked_tokens registra la revocación (logout, rotación de refresh,
 * canje de challenge 2FA). Sin jti, la revocación caería en el id de
 * usuario y un solo logout invalidaría TODOS los tokens de la cuenta.
 */
function newJti() {
  return crypto.randomUUID();
}

function buildSignOptions(expiresIn, extra = {}) {
  return {
    expiresIn,
    algorithm: 'HS256',
    ...extra,
  };
}

function signAccessToken(payload, options = {}) {
  const secret = getAccessTokenSecret();
  const expiresIn = options.expiresIn || ACCESS_EXPIRES_IN;

  const claims = {
    type: TOKEN_TYPE_ACCESS,
    jti: newJti(),
    ...payload,
    ...(options.claims || {}),
  };

  return new Promise((resolve, reject) => {
    jwt.sign(
      claims,
      secret,
      buildSignOptions(expiresIn, options.signOptions),
      (err, token) => {
        if (err) {
          return reject(err);
        }
        return resolve(token);
      }
    );
  });
}

function verifyAccessToken(token, options = {}) {
  const secret = getAccessTokenSecret();

  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      secret,
      {
        algorithms: ['HS256'],
        ...options.verifyOptions,
      },
      (err, decoded) => {
        if (err) {
          return reject(err);
        }
        if (decoded && decoded.type !== TOKEN_TYPE_ACCESS) {
          return reject(new Error('Token type is not access'));
        }
        return resolve(decoded);
      }
    );
  });
}

function signRefreshToken(payload, options = {}) {
  const secret = getRefreshTokenSecret();
  const expiresIn = options.expiresIn || REFRESH_EXPIRES_IN;

  const claims = {
    type: TOKEN_TYPE_REFRESH,
    jti: newJti(),
    ...payload,
    ...(options.claims || {}),
  };

  return new Promise((resolve, reject) => {
    jwt.sign(
      claims,
      secret,
      buildSignOptions(expiresIn, options.signOptions),
      (err, token) => {
        if (err) {
          return reject(err);
        }
        return resolve(token);
      }
    );
  });
}

function verifyRefreshToken(token, options = {}) {
  const secret = getRefreshTokenSecret();

  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      secret,
      {
        algorithms: ['HS256'],
        ...options.verifyOptions,
      },
      (err, decoded) => {
        if (err) {
          return reject(err);
        }
        if (decoded && decoded.type !== TOKEN_TYPE_REFRESH) {
          return reject(new Error('Token type is not refresh'));
        }
        return resolve(decoded);
      }
    );
  });
}

/**
 * Challenge de un solo uso para el segundo paso del login 2FA (5 minutos
 * de vida, ver auth.service.js#verifyTwoFactor). No autentica ninguna
 * petición: solo se canjea en POST /auth/2fa/verify a cambio de tokens de
 * sesión reales.
 */
function signTwoFactorChallenge(payload, options = {}) {
  const secret = getAccessTokenSecret();
  const expiresIn = options.expiresIn || TWO_FACTOR_CHALLENGE_EXPIRES_IN;

  const claims = {
    type: TOKEN_TYPE_TWO_FACTOR_CHALLENGE,
    jti: newJti(),
    ...payload,
    ...(options.claims || {}),
  };

  return new Promise((resolve, reject) => {
    jwt.sign(
      claims,
      secret,
      buildSignOptions(expiresIn, options.signOptions),
      (err, token) => {
        if (err) {
          return reject(err);
        }
        return resolve(token);
      }
    );
  });
}

function verifyTwoFactorChallenge(token, options = {}) {
  const secret = getAccessTokenSecret();

  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      secret,
      {
        algorithms: ['HS256'],
        ...options.verifyOptions,
      },
      (err, decoded) => {
        if (err) {
          return reject(err);
        }
        if (decoded && decoded.type !== TOKEN_TYPE_TWO_FACTOR_CHALLENGE) {
          return reject(new Error('Token type is not a 2FA challenge'));
        }
        return resolve(decoded);
      }
    );
  });
}

function decodeToken(token) {
  try {
    return jwt.decode(token, { complete: true });
  } catch (error) {
    return null;
  }
}

function extractBearerToken(header) {
  if (!header || typeof header !== 'string') {
    return null;
  }

  const match = header.match(/^\s*Bearer\s+(.+)$/i);
  if (!match) {
    return null;
  }

  return match[1].trim() || null;
}

function isTokenExpired(token) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.payload || !decoded.payload.exp) {
    return true;
  }

  return decoded.payload.exp * 1000 < Date.now();
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  signTwoFactorChallenge,
  verifyTwoFactorChallenge,
  decodeToken,
  extractBearerToken,
  isTokenExpired,
  ACCESS_EXPIRES_IN,
  REFRESH_EXPIRES_IN,
  TWO_FACTOR_CHALLENGE_EXPIRES_IN,
  TOKEN_TYPE_ACCESS,
  TOKEN_TYPE_REFRESH,
  TOKEN_TYPE_TWO_FACTOR_CHALLENGE,
};