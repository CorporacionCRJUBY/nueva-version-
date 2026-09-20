// FILE: backend/src/models/academicPeriods.model.js
const db = require('../config/database');
const { escapeLike } = require('../utils/escapeLike');

const TABLE = 'academic_periods';
const FIELDS = [
  'id', 'code', 'academic_year_id', 'name', 'start_date', 'end_date',
  'status', 'is_active', 'grading_config', 'created_at', 'updated_at',
  'deleted_at', 'deleted_by', 'created_by', 'updated_by'
];

const AcademicPeriods = {
  TABLE,
  FIELDS,

  findAll(filters = {}) {
    const { academicYearId, status, search, page, pageSize } = filters;
    let query = db(TABLE)
      .whereNull(`${TABLE}.deleted_at`)
      .leftJoin('academic_years', 'academic_years.id', `${TABLE}.academic_year_id`)
      .select(`${TABLE}.*`, 'academic_years.name as year_name');

    if (academicYearId) query = query.where(`${TABLE}.academic_year_id`, academicYearId);
    if (status) query = query.where(`${TABLE}.status`, status);
    if (search) {
      query = query.where((builder) => {
        builder
          .where(`${TABLE}.name`, 'like', `%${escapeLike(search)}%`)
          .orWhere(`${TABLE}.code`, 'like', `%${escapeLike(search)}%`);
      });
    }

    if (page && pageSize) {
      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);
    }

    return query.orderBy(`${TABLE}.start_date`, 'asc');
  },

  // Mirrors findAll()'s filters so the row query and the count query for
  // pagination never drift out of sync with each other.
  async count(filters = {}) {
    const { academicYearId, status, search } = filters;
    let query = db(TABLE).whereNull('deleted_at');

    if (academicYearId) query = query.where('academic_year_id', academicYearId);
    if (status) query = query.where('status', status);
    if (search) {
      query = query.where((builder) => {
        builder
          .where('name', 'like', `%${escapeLike(search)}%`)
          .orWhere('code', 'like', `%${escapeLike(search)}%`);
      });
    }

    const [{ total }] = await query.count({ total: '*' });
    return Number(total);
  },

  findById(id) {
    return db(TABLE).where({ id, deleted_at: null }).first();
  },

  create(data) {
    return db(TABLE).insert(data);
  },

  update(id, data) {
    return db(TABLE).where({ id }).update({ ...data, updated_at: db.fn.now() });
  },

  softDelete(id, userId) {
    return db(TABLE).where({ id }).update({
      deleted_at: db.fn.now(),
      deleted_by: userId
    });
  },

  close(id, userId) {
    return db(TABLE).where({ id }).update({
      status: 'CLOSED',
      updated_at: db.fn.now(),
      updated_by: userId
    });
  },

  lock(id, userId) {
    return db(TABLE).where({ id }).update({
      status: 'LOCKED',
      updated_at: db.fn.now(),
      updated_by: userId
    });
  }
};

module.exports = AcademicPeriods;