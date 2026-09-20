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
      // Un ajuste vacío se guarda como cadena vacía, nunca como el literal
      // "null" (que es lo que salía al pasar null por String()/JSON.stringify).
      value:
        value === null || value === undefined
          ? ''
          : typeof value === 'object'
            ? JSON.stringify(value)
            : String(value)
    }));
    
    // FIX (bitácora 2026-09-15): `repository.get()` devuelve FILAS de la tabla;
    // pasarlas tal cual a la auditoría metía un array en una columna JSON y el
    // INSERT fallaba en cada guardado. Se auditan como mapa clave -> valor,
    // que además es lo legible en la consola de auditoría.
    const toMap = (rows) =>
      (rows || []).reduce((acc, row) => {
        acc[row.setting_key] = row.setting_value;
        return acc;
      }, {});

    const before = toMap(await repository.get(null));
    await repository.setBulk(settings, null);
    const afterRows = await repository.get(null);
    const after = toMap(afterRows);
    
    await auditService.log({
      user,
      action: 'UPDATE',
      module: 'settings',
      recordCode: 'system_settings',
      before,
      after,
      req
    });

    return after;
  }
};

module.exports = SettingsService;