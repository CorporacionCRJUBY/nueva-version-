'use strict';

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');
const jwtConfig = require('../config/jwt');
const revokedTokensRepository = require('../repositories/revokedTokens.repository');
const cookies = require('../utils/cookies');

const AUTH_HEADER_SCHEME = 'Bearer';
const TOKEN_TYPE_ACCESS = 'access';
const TOKEN_TYPE_REFRESH = 'refresh';

function getTokenFromHeader(req) {
  const header = req.headers.authorization;
  if (!header || typeof header !== 'string') {
    return null;
  }

  const trimmed = header.trim();
  if (!trimmed.toLowerCase().startsWith(AUTH_HEADER_SCHEME.toLowerCase() + ' ')) {
    return null;
  }

  const token = trimmed.slice(AUTH_HEADER_SCHEME.length).trim();
  if (!token) {
    return null;
  }

  return token;
}

function getTokenFromCookie(req) {
  const cookieNameValue = cookies.cookieName();
  const raw = req.cookies && req.cookies[cookieNameValue];
  if (!raw || typeof raw !== 'string') {
    return null;
  }
  return raw.trim() || null;
}

function extractToken(req) {
  return getTokenFromHeader(req) || getTokenFromCookie(req);
}

async function isTokenRevoked(token, type = TOKEN_TYPE_ACCESS) {
  if (!token) {
    return false;
  }

  try {
    const payload = jwt.decode(token);
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    const jti = payload.jti || payload.id || null;
    if (!jti) {
      return false;
    }

    const revoked = await revokedTokensRepository.findById(jti);
    if (!revoked) {
      return false;
    }

    if (type === TOKEN_TYPE_REFRESH) {
      return revoked.token_type === TOKEN_TYPE_REFRESH;
    }

    return revoked.token_type === TOKEN_TYPE_ACCESS || revoked.token_type === TOKEN_TYPE_REFRESH;
  } catch (error) {
    return false;
  }
}

async function authenticate(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Missing authentication token',
          status: 401,
        },
      });
    }

    if (await isTokenRevoked(token, TOKEN_TYPE_ACCESS)) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Token has been revoked',
          status: 401,
        },
      });
    }

    const decoded = await jwtConfig.verifyAccessToken(token);

    req.user = decoded;
    req.authToken = token;

    return next();
  } catch (error) {
    if (error && error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Token has expired',
          status: 401,
        },
      });
    }

    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid authentication token',
        status: 401,
      },
    });
  }
}

async function authenticateOptional(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      return next();
    }

    if (await isTokenRevoked(token, TOKEN_TYPE_ACCESS)) {
      req.user = null;
      req.authToken = null;
      return next();
    }

    let decoded;
    try {
      decoded = await jwtConfig.verifyAccessToken(token);
    } catch (error) {
      req.user = null;
      req.authToken = null;
      return next();
    }

    req.user = decoded;
    req.authToken = token;
    return next();
  } catch (error) {
    req.user = null;
    req.authToken = null;
    return next();
  }
}

function generateSigningKey() {
  const secret = env.JWT_SECRET || env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT secret is not configured');
  }
  const hash = crypto.createHash('sha256').update(String(secret)).digest();
  return crypto.createHmac('sha256', hash).update(String(Date.now())).digest('hex');
}

function splitToken(token) {
  if (typeof token !== 'string') {
    return { token, type: null, payload: null };
  }

  const parts = token.split('.');
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      return { token, type: TOKEN_TYPE_ACCESS, payload };
    } catch (error) {
      return { token, type: null, payload: null };
    }
  }

  if (parts.length === 2) {
    return { token, type: TOKEN_TYPE_REFRESH, payload: null };
  }

  return { token, type: null, payload: null };
}

module.exports = {
  authenticate,
  authenticateOptional,
  extractToken,
  getTokenFromHeader,
  getTokenFromCookie,
  isTokenRevoked,
  generateSigningKey,
  splitToken,
  TOKEN_TYPE_ACCESS,
  TOKEN_TYPE_REFRESH,
};
