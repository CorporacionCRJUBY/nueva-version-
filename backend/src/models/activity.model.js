// FILE: backend/src/models/activity.model.js
const db = require('../config/database');
const { escapeLike } = require('../utils/escapeLike');

const TABLE = 'activity_logs';
const FIELDS = [
  'id', 'user_id', 'module', 'action', 'record_code',
  'details', 'ip', 'user_agent', 'created_at'
];

// Shared by findAll() and count() so the row query and the count query for
// pagination never drift out of sync with each other.
function applyActivityFilters(query, { search, userId, module, action }, tableAlias) {
  if (search) {
    query.where((builder) => {
      builder
        .where(`${tableAlias}.record_code`, 'like', `%${escapeLike(search)}%`)
        .orWhere('users.full_name', 'like', `%${escapeLike(search)}%`);
    });
  }
  if (userId) query.where(`${tableAlias}.user_id`, userId);
  if (module) query.where(`${tableAlias}.module`, module);
  if (action) query.where(`${tableAlias}.action`, action);
  return query;
}

const Activity = {
  TABLE,
  FIELDS,

  findAll(filters = {}) {
    const { search, userId, module, action, page, pageSize, limit } = filters;
    let query = db(TABLE)
      .leftJoin('users', 'users.id', `${TABLE}.user_id`)
      .select(`${TABLE}.*`, 'users.full_name as user_name');
    applyActivityFilters(query, { search, userId, module, action }, TABLE);

    if (limit) {
      return query.orderBy(`${TABLE}.created_at`, 'desc').limit(limit);
    }

    if (page && pageSize) {
      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);
    }

    return query.orderBy(`${TABLE}.created_at`, 'desc');
  },

  // Bug fix: same systemic gap as the other modules — nothing here ever
  // counted matching rows, so the list's pagination footer always showed
  // "0 resultados" no matter how many activity records actually matched.
  async count(filters = {}) {
    const { search, userId, module, action } = filters;
    let query = db(TABLE).leftJoin('users', 'users.id', `${TABLE}.user_id`);
    applyActivityFilters(query, { search, userId, module, action }, TABLE);
    const [{ total }] = await query.count({ total: `${TABLE}.id` });
    return Number(total);
  },

  // Bug fix: ActivityFormPage (the "Ver" detail screen) calls getById, but
  // there was no model/repository/service/controller/route method for it —
  // the route existed in App.jsx but nothing behind it could ever resolve.
  findById(id) {
    return db(TABLE)
      .where(`${TABLE}.id`, id)
      .leftJoin('users', 'users.id', `${TABLE}.user_id`)
      .select(`${TABLE}.*`, 'users.full_name as user_name')
      .first();
  },

  findByUser(userId, limit = 20) {
    return db(TABLE)
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .limit(limit);
  },

  create(data) {
    return db(TABLE).insert(data);
  }
};

module.exports = Activity;