// FILE: backend/src/controllers/settings.controller.js
const settingsService = require('../services/settings.service');

const get = async (req, res, next) => {
  try {
    const data = await settingsService.get(req.user);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await settingsService.update(req.body, req.user, req);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  get,
  update,
};