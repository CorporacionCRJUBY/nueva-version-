// FILE: backend/src/models/progressReports.model.js
const db = require('../config/database');
const { escapeLike } = require('../utils/escapeLike');

const TABLE = 'reports';
const CATEGORY = 'progress-reports';
const FIELDS = [
  'id', 'code', 'category', 'student_id', 'academic_period_id', 'academic_year_id',
  'report_date', 'status', 'version_number', 'pdf_path', 'pdf_url',
  'generated_by', 'notes',
  'created_at', 'updated_at', 'deleted_at', 'deleted_by'
];

// Shared by findAll() and count() so the row query and the count query for
// pagination never drift out of sync with each other.
function applyFilters(query, { search, studentId, academicPeriodId, academicYearId, status, branchIds }) {
  if (search) {
    query.where((builder) => {
      builder
        .where('reports.code', 'like', `%${escapeLike(search)}%`)
        .orWhereRaw("CONCAT(students.first_name, ' ', students.last_name) like ?", [`%${search}%`]);
    });
  }
  if (studentId) query.where('reports.student_id', studentId);
  if (academicPeriodId) query.where('reports.academic_period_id', academicPeriodId);
  if (academicYearId) query.where('reports.academic_year_id', academicYearId);
  if (status) query.where('reports.status', status);
  // FIX (auditoria hallazgo C1): el reporte pertenece a la sede de su estudiante.
  if (branchIds) query.whereIn('students.branch_id', branchIds);
  return query;
}

const ProgressReports = {
  TABLE,
  CATEGORY,
  FIELDS,

  findAll(filters = {}) {
    const { search, studentId, academicPeriodId, academicYearId, status, branchIds, page, pageSize } = filters;
    let query = db(TABLE)
      .whereNull('reports.deleted_at')
      .where('reports.category', CATEGORY)
      .leftJoin('students', 'students.id', 'reports.student_id')
      .leftJoin('academic_periods', 'academic_periods.id', 'reports.academic_period_id')
      .select(
        'reports.*',
        db.raw("CONCAT(students.first_name, ' ', students.last_name) as student_name"),
        'academic_periods.name as academic_period_name'
      );
    applyFilters(query, { search, studentId, academicPeriodId, academicYearId, status, branchIds });

    if (page && pageSize) {
      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);
    }

    return query.orderBy('reports.created_at', 'desc');
  },

  async count(filters = {}) {
    const { search, studentId, academicPeriodId, academicYearId, status, branchIds } = filters;
    let query = db(TABLE)
      .whereNull('reports.deleted_at')
      .where('reports.category', CATEGORY)
      .leftJoin('students', 'students.id', 'reports.student_id');
    applyFilters(query, { search, studentId, academicPeriodId, academicYearId, status, branchIds });
    const [{ total }] = await query.count({ total: 'reports.id' });
    return Number(total);
  },

  // FIX (auditoria hallazgo C1): join con students para exponer branch_id.
  findById(id) {
    return db(TABLE)
      .where({ 'reports.id': id, 'reports.deleted_at': null })
      .where('reports.category', CATEGORY)
      .leftJoin('students', 'students.id', 'reports.student_id')
      .select('reports.*', 'students.branch_id as branch_id')
      .first();
  },

  findByStudent(studentId) {
    return db(TABLE)
      .where({ student_id: studentId, deleted_at: null })
      .where('category', CATEGORY)
      .orderBy('created_at', 'desc');
  },

  findLatestByStudent(studentId) {
    return db(TABLE)
      .where({ student_id: studentId, deleted_at: null })
      .where('category', CATEGORY)
      .orderBy('created_at', 'desc')
      .first();
  },

  create(data) {
    return db(TABLE).insert({ ...data, category: CATEGORY });
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

  generate(id, generatedBy, pdfPath = null) {
    const data = {
      status: 'OFFICIAL',
      generated_by: generatedBy,
      updated_at: db.fn.now()
    };
    if (pdfPath) data.pdf_path = pdfPath;
    return db(TABLE).where({ id }).update(data);
  },

  archive(id) {
    return db(TABLE).where({ id }).update({
      status: 'ARCHIVED',
      updated_at: db.fn.now()
    });
  }
};

module.exports = ProgressReports;
