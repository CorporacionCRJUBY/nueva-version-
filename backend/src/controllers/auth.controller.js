// FILE: backend/src/controllers/auth.controller.js
const authService = require('../services/auth.service');
const { setAuthCookies, clearAuthCookies, REFRESH_TOKEN_COOKIE } = require('../utils/cookies');

// FIX (auditoria hallazgo medio #2 - JWT en localStorage): login/refresh ya
// no devuelven accessToken/refreshToken en el body JSON — eso es lo que le
// permitía al frontend guardarlos en localStorage, expuestos a robo por
// XSS. Ahora los tokens salen únicamente vía `Set-Cookie` con httpOnly
// (ver utils/cookies.js), y el body de la respuesta solo lleva datos no
// sensibles (perfil del usuario) que el frontend sí necesita poder leer
// desde JS para pintar la UI.
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const data = await authService.login(email, password, req);

    // FIX (auditoria hallazgo bajo #2 - falta de 2FA): si la cuenta tiene
    // el segundo factor activo, authService.login() no devuelve tokens de
    // sesión (ver auth.service.js) — no hay nada que poner en cookies
    // todavía. Se le manda al frontend un challengeToken de corta vida
    // para que complete el flujo en POST /auth/2fa/verify.
    if (data.twoFactorRequired) {
      return res.json({
        success: true,
        data: { twoFactorRequired: true, challengeToken: data.challengeToken },
      });
    }

    setAuthCookies(res, { accessToken: data.accessToken, refreshToken: data.refreshToken });
    res.json({ success: true, data: { twoFactorRequired: false, user: data.user } });
  } catch (error) {
    next(error);
  }
};

// FIX (auditoria hallazgo bajo #2 - falta de 2FA): segundo paso del login
// para cuentas con 2FA activo. No usa `authenticate` — el usuario todavía
// no tiene una sesión real, solo el challengeToken de corta vida que
// login() le entregó.
const verifyTwoFactor = async (req, res, next) => {
  try {
    const { challengeToken, code } = req.body;
    const data = await authService.verifyTwoFactor(challengeToken, code, req);
    setAuthCookies(res, { accessToken: data.accessToken, refreshToken: data.refreshToken });
    res.json({ success: true, data: { user: data.user } });
  } catch (error) {
    next(error);
  }
};

const setupTwoFactor = async (req, res, next) => {
  try {
    const data = await authService.setupTwoFactor(req.user.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const confirmTwoFactor = async (req, res, next) => {
  try {
    const { code } = req.body;
    const data = await authService.confirmTwoFactor(req.user.id, code);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const disableTwoFactor = async (req, res, next) => {
  try {
    const { password } = req.body;
    await authService.disableTwoFactor(req.user.id, password, req);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};

const regenerateBackupCodes = async (req, res, next) => {
  try {
    const { password } = req.body;
    const data = await authService.regenerateBackupCodes(req.user.id, password);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const me = async (req, res, next) => {
  try {
    const data = await authService.getCurrentUser(req.user.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    // El refresh token ya no llega en el body: se lee de la cookie httpOnly
    // (path /api/auth) para revocarlo junto con el access token, igual que
    // antes (ver AuthService.logout — auditoria hallazgo alto #5), y luego
    // se limpian ambas cookies en el navegador.
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
    await authService.logout(req.user, refreshToken, req);
    clearAuthCookies(res);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        code: 'NO_REFRESH_TOKEN',
        message: 'Refresh token missing',
      });
    }

    const data = await authService.refreshToken(refreshToken);
    setAuthCookies(res, data);
    res.json({ success: true, data: null });
  } catch (error) {
    // Si el refresh falla (token inválido/revocado/expirado), limpiamos las
    // cookies para no dejar en el navegador un accessToken viejo que el
    // interceptor del frontend seguiría intentando usar en un loop.
    clearAuthCookies(res);
    next(error);
  }
};

module.exports = {
  login,
  me,
  logout,
  refresh,
  verifyTwoFactor,
  setupTwoFactor,
  confirmTwoFactor,
  disableTwoFactor,
  regenerateBackupCodes,
};