// FILE: backend/src/models/transcripts.model.js
const db = require('../config/database');
const { escapeLike } = require('../utils/escapeLike');

const TABLE = 'transcripts';
const FIELDS = [
  'id', 'code', 'student_id', 'academic_period_id', 'academic_year_id',
  'transcript_type', 'status', 'version_number', 'pdf_path', 'pdf_url',
  'generated_by', 'approved_by', 'approved_at', 'notes',
  'created_at', 'updated_at', 'deleted_at', 'deleted_by'
];

// Shared by findAll() and count() so the row query and the count query for
// pagination never drift out of sync with each other.
function applyFilters(query, { search, studentId, academicPeriodId, academicYearId, status, transcriptType, branchIds }) {
  if (search) {
    query.where((builder) => {
      builder
        .where('transcripts.code', 'like', `%${escapeLike(search)}%`)
        .orWhereRaw("CONCAT(students.first_name, ' ', students.last_name) like ?", [`%${search}%`]);
    });
  }
  if (studentId) query.where('transcripts.student_id', studentId);
  if (academicPeriodId) query.where('transcripts.academic_period_id', academicPeriodId);
  if (academicYearId) query.where('transcripts.academic_year_id', academicYearId);
  if (status) query.where('transcripts.status', status);
  if (transcriptType) query.where('transcripts.transcript_type', transcriptType);
  // FIX (auditoria hallazgo C1): un transcript pertenece a la sede de su estudiante.
  if (branchIds) query.whereIn('students.branch_id', branchIds);
  return query;
}

const Transcripts = {
  TABLE,
  FIELDS,

  findAll(filters = {}) {
    const { search, studentId, academicPeriodId, academicYearId, status, transcriptType, branchIds, page, pageSize } = filters;
    let query = db(TABLE)
      .whereNull('transcripts.deleted_at')
      .leftJoin('students', 'students.id', 'transcripts.student_id')
      .leftJoin('academic_periods', 'academic_periods.id', 'transcripts.academic_period_id')
      .select(
        'transcripts.*',
        db.raw("CONCAT(students.first_name, ' ', students.last_name) as student_name"),
        'academic_periods.name as academic_period_name'
      );
    applyFilters(query, { search, studentId, academicPeriodId, academicYearId, status, transcriptType, branchIds });

    if (page && pageSize) {
      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);
    }

    return query.orderBy('transcripts.created_at', 'desc');
  },

  async count(filters = {}) {
    const { search, studentId, academicPeriodId, academicYearId, status, transcriptType, branchIds } = filters;
    let query = db(TABLE)
      .whereNull('transcripts.deleted_at')
      .leftJoin('students', 'students.id', 'transcripts.student_id');
    applyFilters(query, { search, studentId, academicPeriodId, academicYearId, status, transcriptType, branchIds });
    const [{ total }] = await query.count({ total: 'transcripts.id' });
    return Number(total);
  },

  // FIX (auditoria hallazgo C1): join con students para exponer branch_id.
  findById(id) {
    return db(TABLE)
      .where({ 'transcripts.id': id, 'transcripts.deleted_at': null })
      .leftJoin('students', 'students.id', 'transcripts.student_id')
      .select('transcripts.*', 'students.branch_id as branch_id')
      .first();
  },

  findByStudent(studentId) {
    return db(TABLE)
      .where({ student_id: studentId, deleted_at: null })
      .orderBy('created_at', 'desc');
  },

  findLatestByStudent(studentId, transcriptType = null) {
    let query = db(TABLE)
      .where({ student_id: studentId, deleted_at: null })
      .orderBy('created_at', 'desc');

    if (transcriptType) query = query.where('transcript_type', transcriptType);

    return query.first();
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

  generate(id, generatedBy, pdfPath = null) {
    const data = {
      status: 'OFFICIAL',
      generated_by: generatedBy,
      updated_at: db.fn.now()
    };
    if (pdfPath) data.pdf_path = pdfPath;
    return db(TABLE).where({ id }).update(data);
  },

  reprint(id, generatedBy, pdfPath = null) {
    const data = {
      status: 'REPRINTED',
      version_number: db.raw('version_number + 1'),
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

module.exports = Transcripts;
