// FILE: backend/src/models/settings.model.js
const db = require('../config/database');

const TABLE = 'system_settings';
const FIELDS = [
  'id', 'user_id', 'setting_key', 'setting_value',
  'created_at', 'updated_at'
];

const Settings = {
  TABLE,
  FIELDS,

  findAll(userId = null) {
    let query = db(TABLE);
    if (userId) {
      query = query.where({ user_id: userId });
    } else {
      query = query.whereNull('user_id');
    }
    return query;
  },

  get(userId = null) {
    let query = db(TABLE);
    if (userId) {
      query = query.where({ user_id: userId });
    } else {
      query = query.whereNull('user_id');
    }
    return query.select('setting_key', 'setting_value');
  },

  getByKey(key, userId = null) {
    let query = db(TABLE).where('setting_key', key);
    if (userId) {
      query = query.where({ user_id: userId });
    } else {
      query = query.whereNull('user_id');
    }
    return query.first();
  },

  set(key, value, userId = null) {
    return db(TABLE).insert({
      user_id: userId,
      setting_key: key,
      setting_value: value
    }).onConflict(['user_id', 'setting_key']).merge();
  },

  setBulk(settings, userId = null) {
    const records = settings.map(s => ({
      user_id: userId,
      setting_key: s.key,
      setting_value: s.value
    }));
    return db(TABLE).insert(records).onConflict(['user_id', 'setting_key']).merge();
  },

  delete(key, userId = null) {
    let query = db(TABLE).where('setting_key', key);
    if (userId) {
      query = query.where({ user_id: userId });
    } else {
      query = query.whereNull('user_id');
    }
    return query.del();
  }
};

module.exports = Settings;