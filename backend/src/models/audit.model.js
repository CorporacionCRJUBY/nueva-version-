// FILE: backend/src/models/audit.model.js
const db = require('../config/database');
const { escapeLike } = require('../utils/escapeLike');

const TABLE = 'audit_logs';
const FIELDS = [
  'id', 'user_id', 'action', 'module', 'record_code',
  'before', 'after', 'reason', 'ip', 'user_agent', 'created_at'
];

// Shared by findAll() and count() so the row query and the count query for
// pagination never drift out of sync with each other.
function applyAuditFilters(query, { search, userId, module, action, recordCode, dateFrom, dateTo }, tableAlias) {
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
  if (recordCode) query.where(`${tableAlias}.record_code`, recordCode);
  if (dateFrom) query.where(`${tableAlias}.created_at`, '>=', dateFrom);
  if (dateTo) query.where(`${tableAlias}.created_at`, '<=', dateTo);
  return query;
}

const Audit = {
  TABLE,
  FIELDS,

  findAll(filters = {}) {
    const { search, userId, module, action, recordCode, dateFrom, dateTo, page, pageSize } = filters;
    let query = db(TABLE)
      .leftJoin('users', 'users.id', `${TABLE}.user_id`)
      .select(`${TABLE}.*`, 'users.full_name as user_name');
    applyAuditFilters(query, { search, userId, module, action, recordCode, dateFrom, dateTo }, TABLE);

    if (page && pageSize) {
      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);
    }

    return query.orderBy(`${TABLE}.created_at`, 'desc');
  },

  // Bug fix: the list page always showed "0 resultados" because nothing in
  // this chain ever counted matching rows — findAll only ever returned a
  // page of data with no total, same systemic gap fixed in the other
  // modules' models. The join to `users` here (kept even though count()
  // only needs audit_logs) is required so a `search` filter can match
  // against the actor's name, same as it does in findAll().
  async count(filters = {}) {
    const { search, userId, module, action, recordCode, dateFrom, dateTo } = filters;
    let query = db(TABLE).leftJoin('users', 'users.id', `${TABLE}.user_id`);
    applyAuditFilters(query, { search, userId, module, action, recordCode, dateFrom, dateTo }, TABLE);
    const [{ total }] = await query.count({ total: `${TABLE}.id` });
    return Number(total);
  },

  // Bug fix: AuditFormPage (the "Ver" detail screen) calls getById, but
  // there was no model/repository/service/controller/route method for it
  // at all — every click on "Ver" threw immediately. Added end to end.
  findById(id) {
    return db(TABLE)
      .where(`${TABLE}.id`, id)
      .leftJoin('users', 'users.id', `${TABLE}.user_id`)
      .select(`${TABLE}.*`, 'users.full_name as user_name')
      .first();
  },

  findByRecordCode(recordCode) {
    return db(TABLE)
      .where('record_code', recordCode)
      .orderBy('created_at', 'asc');
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

module.exports = Audit;