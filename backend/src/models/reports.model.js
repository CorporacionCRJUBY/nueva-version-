// FILE: backend/src/models/reports.model.js
const db = require('../config/database');
const { escapeLike } = require('../utils/escapeLike');

const TABLE = 'reports';
const FIELDS = [
  'id', 'code', 'category', 'student_id', 'academic_period_id',
  'academic_year_id', 'report_date', 'status', 'version_number',
  'pdf_path', 'pdf_url', 'generated_by', 'notes',
  'created_at', 'updated_at', 'deleted_at', 'deleted_by'
];

// Shared by findAll() and count() so the row query and the count query for
// pagination never drift out of sync with each other.
function applyReportsFilters(query, { search, category, studentId, academicPeriodId, status, dateFrom, dateTo }) {
  if (search) {
    query.where((builder) => {
      builder
        .where('reports.code', 'like', `%${escapeLike(search)}%`)
        .orWhere('students.first_name', 'like', `%${escapeLike(search)}%`)
        .orWhere('students.last_name', 'like', `%${escapeLike(search)}%`);
    });
  }
  if (category) query.where('reports.category', category);
  if (studentId) query.where('reports.student_id', studentId);
  if (academicPeriodId) query.where('reports.academic_period_id', academicPeriodId);
  if (status) query.where('reports.status', status);
  if (dateFrom) query.where('reports.report_date', '>=', dateFrom);
  if (dateTo) query.where('reports.report_date', '<=', dateTo);
  return query;
}

const Reports = {
  TABLE,
  FIELDS,

  findAll(filters = {}) {
    const { search, category, studentId, academicPeriodId, status, dateFrom, dateTo, page, pageSize } = filters;
    let query = db(TABLE)
      .whereNull('reports.deleted_at')
      .leftJoin('students', 'students.id', 'reports.student_id')
      .select(
        'reports.*',
        db.raw("CONCAT(students.first_name, ' ', students.last_name) as student_name")
      );
    applyReportsFilters(query, { search, category, studentId, academicPeriodId, status, dateFrom, dateTo });

    if (page && pageSize) {
      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);
    }

    return query.orderBy('reports.created_at', 'desc');
  },

  async count(filters = {}) {
    const { search, category, studentId, academicPeriodId, status, dateFrom, dateTo } = filters;
    let query = db(TABLE)
      .whereNull('reports.deleted_at')
      .leftJoin('students', 'students.id', 'reports.student_id');
    applyReportsFilters(query, { search, category, studentId, academicPeriodId, status, dateFrom, dateTo });
    const [{ total }] = await query.count({ total: 'reports.id' });
    return Number(total);
  },

  findById(id) {
    return db(TABLE)
      .where({ 'reports.id': id, 'reports.deleted_at': null })
      .leftJoin('students', 'students.id', 'reports.student_id')
      .select(
        'reports.*',
        db.raw("CONCAT(students.first_name, ' ', students.last_name) as student_name")
      )
      .first();
  },

  findByCategory(category) {
    return db(TABLE)
      .where({ category, deleted_at: null })
      .orderBy('created_at', 'desc');
  },

  findByStudent(studentId) {
    return db(TABLE)
      .where({ student_id: studentId, deleted_at: null })
      .orderBy('created_at', 'desc');
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

module.exports = Reports;