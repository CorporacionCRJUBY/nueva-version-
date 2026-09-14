// FILE: backend/src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const authRateLimitMiddleware = require('../middleware/authRateLimit.middleware');
const loginRateLimiter = authRateLimitMiddleware;
const refreshRateLimiter = authRateLimitMiddleware;
const { body } = require('express-validator');

// FIX (auditoria hallazgo medio #3 - sin rate-limiting específico en el
// endpoint de login): el rate limiter global (300 req/15min por IP,
// pensado para toda la API) no protegía este endpoint en particular contra
// enumeración de usuarios o intentos distribuidos por IP. `loginRateLimiter`
// va antes de la validación de body para contar también los intentos con
// payload inválido.
router.post('/login', loginRateLimiter, [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
], validate, controller.login);

// FIX (auditoria hallazgo medio #2 - JWT en localStorage): el refresh token
// ya no se manda en el body (controller.refresh lo lee de la cookie
// httpOnly), así que no hay nada que validar aquí.
router.post('/refresh', refreshRateLimiter, controller.refresh);

router.post('/logout', authenticate, controller.logout);
router.get('/me', authenticate, controller.me);

// FIX (auditoria hallazgo bajo #2 - falta de 2FA):
// - /2fa/verify: segundo paso del login, canjea el challengeToken de
//   login() por una sesión real. Va detrás del mismo rate limiter que
//   /login (10 intentos/15min por IP) — es la misma superficie de
//   fuerza bruta que un endpoint de login normal, solo que contra un
//   código de 6 dígitos en vez de una contraseña.
// - /2fa/setup, /2fa/confirm, /2fa/disable, /2fa/backup-codes/regenerate:
//   requieren sesión activa (`authenticate`) — son autoservicio sobre la
//   propia cuenta, nunca sobre la de otro usuario.
router.post('/2fa/verify', loginRateLimiter, [
  body('challengeToken').notEmpty().withMessage('challengeToken is required'),
  body('code').notEmpty().withMessage('code is required'),
], validate, controller.verifyTwoFactor);

router.post('/2fa/setup', authenticate, controller.setupTwoFactor);

router.post('/2fa/confirm', authenticate, [
  body('code').isLength({ min: 6, max: 6 }).withMessage('code must be 6 digits'),
], validate, controller.confirmTwoFactor);

router.post('/2fa/disable', authenticate, [
  body('password').notEmpty().withMessage('password is required'),
], validate, controller.disableTwoFactor);

router.post('/2fa/backup-codes/regenerate', authenticate, [
  body('password').notEmpty().withMessage('password is required'),
], validate, controller.regenerateBackupCodes);

module.exports = router;