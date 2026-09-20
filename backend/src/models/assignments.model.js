// FILE: backend/src/models/assignments.model.js
const db = require('../config/database');
const { escapeLike } = require('../utils/escapeLike');

const TABLE = 'academic_assignments';
const FIELDS = [
  'id', 'code', 'teacher_id', 'subject_id', 'grade', 'section',
  'branch_id', 'academic_year_id', 'schedule', 'status', 'created_at',
  'updated_at', 'deleted_at', 'deleted_by', 'created_by', 'updated_by'
];

// Shared by findAll() and count() so the row query and the count query for
// pagination never drift out of sync with each other.
function applyAssignmentFilters(query, { search, teacherId, subjectId, grade, section, branchId, branchIds, academicYearId, status }) {
  if (search) {
    query.where((builder) => {
      builder
        .where('academic_assignments.code', 'like', `%${escapeLike(search)}%`)
        .orWhere('academic_assignments.section', 'like', `%${escapeLike(search)}%`)
        .orWhere('academic_assignments.schedule', 'like', `%${escapeLike(search)}%`);
    });
  }
  if (teacherId) query.where('academic_assignments.teacher_id', teacherId);
  if (subjectId) query.where('academic_assignments.subject_id', subjectId);
  if (grade) query.where('academic_assignments.grade', grade);
  if (section) query.where('academic_assignments.section', section);
  if (branchId) query.where('academic_assignments.branch_id', branchId);
  // FIX (auditoria hallazgo C1): sedes permitidas del usuario (multi-sede, sin branchId específico).
  if (branchIds) query.whereIn('academic_assignments.branch_id', branchIds);
  if (academicYearId) query.where('academic_assignments.academic_year_id', academicYearId);
  if (status) query.where('academic_assignments.status', status);
  return query;
}

const Assignments = {
  TABLE,
  FIELDS,

  findAll(filters = {}) {
    const { search, teacherId, subjectId, grade, section, branchId, branchIds, academicYearId, status, page, pageSize } = filters;
    let query = db(TABLE)
      .whereNull('academic_assignments.deleted_at')
      .leftJoin('teachers', 'teachers.id', 'academic_assignments.teacher_id')
      .leftJoin('subjects', 'subjects.id', 'academic_assignments.subject_id')
      .leftJoin('branches', 'branches.id', 'academic_assignments.branch_id')
      .select(
        'academic_assignments.*',
        db.raw("CONCAT(teachers.first_name, ' ', teachers.last_name) as teacher_name"),
        'subjects.name as subject_name',
        'branches.name as branch_name'
      );
    applyAssignmentFilters(query, { search, teacherId, subjectId, grade, section, branchId, branchIds, academicYearId, status });

    if (page && pageSize) {
      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);
    }

    return query.orderBy('academic_assignments.created_at', 'desc');
  },

  async count(filters = {}) {
    const { search, teacherId, subjectId, grade, section, branchId, branchIds, academicYearId, status } = filters;
    let query = db(TABLE).whereNull('academic_assignments.deleted_at');
    applyAssignmentFilters(query, { search, teacherId, subjectId, grade, section, branchId, branchIds, academicYearId, status });
    const [{ total }] = await query.count({ total: '*' });
    return Number(total);
  },

  findById(id) {
    return db(TABLE).where({ id, deleted_at: null }).first();
  },

  findByTeacher(teacherId, academicYearId = null) {
    let query = db(TABLE).where({ teacher_id: teacherId, deleted_at: null });
    if (academicYearId) query = query.where('academic_year_id', academicYearId);
    return query.orderBy('created_at', 'desc');
  },

  findBySection(section, academicYearId = null) {
    let query = db(TABLE).where({ section, deleted_at: null });
    if (academicYearId) query = query.where('academic_year_id', academicYearId);
    return query.orderBy('created_at', 'desc');
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

module.exports = Assignments;