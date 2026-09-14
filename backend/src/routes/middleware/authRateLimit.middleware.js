'use strict';

const rateLimit = require('express-rate-limit');

const AUTH_RATE_LIMIT_WINDOW_MS = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 60000;
const AUTH_RATE_LIMIT_MAX = Number(process.env.AUTH_RATE_LIMIT_MAX) || 5;

const authRateLimitMiddleware = rateLimit({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  max: AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many authentication requests, please try again later.',
      status: 429,
    },
  },
  skipSuccessfulRequests: true,
  skip: (req) => {
    const path = (req && req.path) || '';
    if (path === '/health' || path === '/ping' || path === '/favicon.ico') {
      return true;
    }
    return false;
  },
});

module.exports = authRateLimitMiddleware;
