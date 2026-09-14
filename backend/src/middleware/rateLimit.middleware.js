'use strict';

const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS || 60000,
  max: env.RATE_LIMIT_MAX || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many requests, please try again later.',
      status: 429,
    },
  },
  skip: (req) => {
    const path = req.path || '';
    if (path === '/health' || path === '/ping' || path === '/health/live' || path === '/health/ready' || path === '/favicon.ico') {
      return true;
    }
    return false;
  },
});

module.exports = { rateLimiter: limiter };
