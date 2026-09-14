// FILE: backend/src/models/documents.model.js
const db = require('../config/database');
const { escapeLike } = require('../utils/escapeLike');

const TABLE = 'documents';
const FIELDS = [
  'id', 'code', 'student_id', 'document_type', 'title', 'file_path',
  'file_name', 'file_size', 'mime_type', 'status', 'upload_date',
  'created_at', 'updated_at', 'deleted_at', 'deleted_by', 'created_by', 'updated_by'
];

// Shared by findAll() and count() so the row query and the count query for
// pagination never drift out of sync with each other.
function applyDocumentFilters(query, { search, studentId, documentType, status, branchIds }) {
  if (search) {
    query.where((builder) => {
      builder
        .where('documents.code', 'like', `%${escapeLike(search)}%`)
        .orWhere('documents.title', 'like', `%${escapeLike(search)}%`)
        .orWhere('students.first_name', 'like', `%${escapeLike(search)}%`)
        .orWhere('students.last_name', 'like', `%${escapeLike(search)}%`);
    });
  }
  if (studentId) query.where('documents.student_id', studentId);
  // FIX (auditoria hallazgo C1): un documento pertenece a la sede de su
  // estudiante, no tiene branch_id propio.
  if (branchIds) query.whereIn('students.branch_id', branchIds);
  if (documentType) query.where('documents.document_type', documentType);
  if (status) query.where('documents.status', status);
  return query;
}

const Documents = {
  TABLE,
  FIELDS,

  findAll(filters = {}) {
    const { search, studentId, documentType, status, branchIds, page, pageSize } = filters;
    let query = db(TABLE)
      .whereNull('documents.deleted_at')
      .leftJoin('students', 'students.id', 'documents.student_id')
      .select(
        'documents.*',
        db.raw("CONCAT(students.first_name, ' ', students.last_name) as student_name")
      );
    applyDocumentFilters(query, { search, studentId, documentType, status, branchIds });

    if (page && pageSize) {
      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);
    }

    return query.orderBy('documents.created_at', 'desc');
  },

  async count(filters = {}) {
    const { search, studentId, documentType, status, branchIds } = filters;
    let query = db(TABLE)
      .whereNull('documents.deleted_at')
      .leftJoin('students', 'students.id', 'documents.student_id');
    applyDocumentFilters(query, { search, studentId, documentType, status, branchIds });
    const [{ total }] = await query.count({ total: 'documents.id' });
    return Number(total);
  },

  // FIX (auditoria hallazgo C1): join con students para exponer branch_id
  // y permitir validar la sede en el service con assertBranchAccess().
  findById(id) {
    return db(TABLE)
      .where({ 'documents.id': id, 'documents.deleted_at': null })
      .leftJoin('students', 'students.id', 'documents.student_id')
      .select('documents.*', 'students.branch_id as branch_id')
      .first();
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

module.exports = Documents;