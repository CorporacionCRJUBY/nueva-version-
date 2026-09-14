// FILE: backend/src/services/settings.service.js
const repository = require('../repositories/settings.repository');
const auditService = require('./audit.service');

const SettingsService = {
  // Bug fix: these are the institution-wide settings seeded with
  // user_id = NULL (Plan §81) and read that way everywhere business logic
  // needs them — e.g. gpa.service.js's getGpaScale() always reads
  // settingsRepository.getByKey('gpa_scale', null). This service used to
  // scope get()/update() to `user?.id`, which is truthy for every
  // authenticated request, so it silently read/wrote a private per-admin
  // copy that nothing else in the app ever looked at: an admin could edit
  // and save "GPA Scale" here with no error, and it would never affect an
  // actual GPA calculation, while a different admin would see a blank
  // form. These are always global, so the user_id column is intentionally
  // ignored for scoping (kept only in the schema for a possible future
  // per-user preferences feature, not what this screen manages).
  async get(user) {
    const settings = await repository.get(null);
    const result = {};
    for (const s of settings) {
      result[s.setting_key] = s.setting_value;
    }
    return result;
  },

  async update(payload, user, req) {
    // Convert payload to array of {key, value}
    const settings = Object.entries(payload).map(([key, value]) => ({
      key,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value)
    }));
    
    const before = await repository.get(null);
    await repository.setBulk(settings, null);
    const after = await repository.get(null);
    
    await auditService.log({
      user,
      action: 'UPDATE',
      module: 'settings',
      recordCode: 'system_settings',
      before: before,
      after: after,
      req
    });
    
    return after;
  }
};

module.exports = SettingsService;