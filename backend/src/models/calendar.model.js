// FILE: backend/src/models/calendar.model.js
const db = require('../config/database');
const { escapeLike } = require('../utils/escapeLike');

const TABLE = 'school_calendar';
const FIELDS = [
  'id', 'code', 'branch_id', 'academic_year_id', 'date', 'title',
  'description', 'event_type', 'is_holiday', 'is_working_day', 'status',
  'created_at', 'updated_at', 'deleted_at', 'deleted_by', 'created_by', 'updated_by'
];

// Shared by findAll() and count() so the row query and the count query for
// pagination never drift out of sync with each other. (Same systemic bug
// found across Branches/Teachers/Subjects/Graduation/Gransif/Academic
// History: this model had no count() at all, so the generic list endpoint
// always reported 0 total even when rows existed.)
function applyCalendarFilters(query, { search, year, month, branchId, branchIds, academicYearId, eventType, status }) {
  if (search) {
    query.where((builder) => {
      builder
        .where('school_calendar.code', 'like', `%${escapeLike(search)}%`)
        .orWhere('school_calendar.title', 'like', `%${escapeLike(search)}%`);
    });
  }
  if (year) query.whereRaw('YEAR(??) = ?', ['school_calendar.date', year]);
  if (month) query.whereRaw('MONTH(??) = ?', ['school_calendar.date', month]);
  if (branchId) query.where('school_calendar.branch_id', branchId);
  // FIX (aislamiento por sede): permite restringir a un conjunto de sedes
  // (las del usuario autenticado) en vez de solo un branchId opcional que
  // el cliente podía omitir para ver todas las sedes.
  if (branchIds) query.whereIn('school_calendar.branch_id', branchIds);
  if (academicYearId) query.where('school_calendar.academic_year_id', academicYearId);
  if (eventType) query.where('school_calendar.event_type', eventType);
  if (status) query.where('school_calendar.status', status);
  return query;
}

const Calendar = {
  TABLE,
  FIELDS,

  findAll(filters = {}) {
    const { search, year, month, branchId, branchIds, academicYearId, eventType, status, page, pageSize } = filters;
    let query = db(TABLE)
      .whereNull('school_calendar.deleted_at')
      .leftJoin('branches', 'branches.id', 'school_calendar.branch_id')
      .select('school_calendar.*', 'branches.name as branch_name');
    applyCalendarFilters(query, { search, year, month, branchId, branchIds, academicYearId, eventType, status });

    if (page && pageSize) {
      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);
    }

    return query.orderBy('school_calendar.date', 'asc');
  },

  async count(filters = {}) {
    const { search, year, month, branchId, branchIds, academicYearId, eventType, status } = filters;
    let query = db(TABLE).whereNull('school_calendar.deleted_at');
    applyCalendarFilters(query, { search, year, month, branchId, branchIds, academicYearId, eventType, status });
    const [{ total }] = await query.count({ total: 'school_calendar.id' });
    return Number(total);
  },

  findById(id) {
    return db(TABLE).where({ id, deleted_at: null }).first();
  },

  findByMonth(year, month, branchId = null, academicYearId = null, page = null, pageSize = null, branchIds = null) {
    let query = db(TABLE)
      .whereNull('school_calendar.deleted_at')
      .whereRaw('YEAR(??) = ?', ['school_calendar.date', year])
      .whereRaw('MONTH(??) = ?', ['school_calendar.date', month])
      .leftJoin('branches', 'branches.id', 'school_calendar.branch_id')
      .select('school_calendar.*', 'branches.name as branch_name');

    if (branchId) query = query.where('school_calendar.branch_id', branchId);
    if (branchIds) query = query.whereIn('school_calendar.branch_id', branchIds);
    if (academicYearId) query = query.where('school_calendar.academic_year_id', academicYearId);

    if (page && pageSize) {
      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);
    }

    return query.orderBy('school_calendar.date', 'asc');
  },

  async countByMonth(year, month, branchId = null, academicYearId = null, branchIds = null) {
    let query = db(TABLE)
      .whereNull('deleted_at')
      .whereRaw('YEAR(??) = ?', ['date', year])
      .whereRaw('MONTH(??) = ?', ['date', month]);

    if (branchId) query = query.where('branch_id', branchId);
    if (branchIds) query = query.whereIn('branch_id', branchIds);
    if (academicYearId) query = query.where('academic_year_id', academicYearId);

    const [{ total }] = await query.count({ total: 'id' });
    return Number(total);
  },

  findWorkingDays(year, month, branchId = null) {
    let query = db(TABLE).whereNull('deleted_at')
      .where('is_working_day', true)
      .whereRaw('YEAR(??) = ?', ['date', year])
      .whereRaw('MONTH(??) = ?', ['date', month]);

    if (branchId) query = query.where('branch_id', branchId);

    return query;
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
  }
};

module.exports = Calendar;