// FILE: backend/src/repositories/settings.repository.js
const SettingsModel = require('../models/settings.model');

const SettingsRepository = {
  findAll: (userId) => SettingsModel.findAll(userId),
  get: (userId) => SettingsModel.get(userId),
  getByKey: (key, userId) => SettingsModel.getByKey(key, userId),
  set: (key, value, userId) => SettingsModel.set(key, value, userId),
  setBulk: (settings, userId) => SettingsModel.setBulk(settings, userId),
  delete: (key, userId) => SettingsModel.delete(key, userId),
};

module.exports = SettingsRepository;