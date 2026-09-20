// FILE: backend/src/models/attendance.model.js
const db = require('../config/database');
const { escapeLike } = require('../utils/escapeLike');

const TABLE = 'attendance_records';
const FIELDS = [
  'id', 'code', 'assignment_id', 'student_id', 'date', 'status',
  'check_in_time', 'check_out_time', 'notes', 'created_at', 'updated_at',
  'deleted_at', 'deleted_by', 'created_by', 'updated_by'
];

// Shared by findAll() and count() so the row query and the count query for
// pagination never drift out of sync with each other.
function applyAttendanceFilters(query, { search, assignmentId, studentId, dateFrom, dateTo, status, branchIds }) {
  if (search) {
    query.where((builder) => {
      builder
        .where('attendance_records.code', 'like', `%${escapeLike(search)}%`)
        .orWhere('attendance_records.notes', 'like', `%${escapeLike(search)}%`);
    });
  }
  if (assignmentId) query.where('attendance_records.assignment_id', assignmentId);
  if (studentId) query.where('attendance_records.student_id', studentId);
  if (dateFrom) query.where('attendance_records.date', '>=', dateFrom);
  if (dateTo) query.where('attendance_records.date', '<=', dateTo);
  if (status) query.where('attendance_records.status', status);
  // FIX (auditoria hallazgo C1): el registro de asistencia pertenece a la sede de su estudiante.
  if (branchIds) query.whereIn('students.branch_id', branchIds);
  return query;
}

const Attendance = {
  TABLE,
  FIELDS,

  findAll(filters = {}) {
    const { search, assignmentId, studentId, dateFrom, dateTo, status, branchIds, page, pageSize } = filters;
    let query = db(TABLE)
      .whereNull('attendance_records.deleted_at')
      .leftJoin('students', 'students.id', 'attendance_records.student_id')
      .leftJoin('academic_assignments', 'academic_assignments.id', 'attendance_records.assignment_id')
      .select(
        'attendance_records.*',
        db.raw("CONCAT(students.first_name, ' ', students.last_name) as student_name"),
        'academic_assignments.code as assignment_name'
      );
    applyAttendanceFilters(query, { search, assignmentId, studentId, dateFrom, dateTo, status, branchIds });

    if (page && pageSize) {
      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);
    }

    return query.orderBy('attendance_records.date', 'desc');
  },

  async count(filters = {}) {
    const { search, assignmentId, studentId, dateFrom, dateTo, status, branchIds } = filters;
    let query = db(TABLE).whereNull('attendance_records.deleted_at');
    if (branchIds) query.leftJoin('students', 'students.id', 'attendance_records.student_id');
    applyAttendanceFilters(query, { search, assignmentId, studentId, dateFrom, dateTo, status, branchIds });
    const [{ total }] = await query.count({ total: 'attendance_records.id' });
    return Number(total);
  },

  // FIX (auditoria hallazgo C1): join con students para exponer branch_id.
  findById(id) {
    return db(TABLE)
      .where({ 'attendance_records.id': id, 'attendance_records.deleted_at': null })
      .leftJoin('students', 'students.id', 'attendance_records.student_id')
      .select('attendance_records.*', 'students.branch_id as branch_id')
      .first();
  },

  findDaily(assignmentId, date) {
    return db(TABLE)
      .join('students', 'attendance_records.student_id', 'students.id')
      .where({ 'attendance_records.assignment_id': assignmentId, 'attendance_records.date': date, 'attendance_records.deleted_at': null })
      .select(
        'attendance_records.*',
        'students.first_name',
        'students.last_name',
        'students.code as student_code',
        'students.grade as student_grade'
      )
      .orderBy('students.last_name', 'asc');
  },

  findMonthly(assignmentId, year, month) {
    const paddedMonth = String(month).padStart(2, '0');
    const startDate = `${year}-${paddedMonth}-01`;
    const daysInMonth = new Date(year, month, 0).getDate();
    const endDate = `${year}-${paddedMonth}-${String(daysInMonth).padStart(2, '0')}`;
    
    return db(TABLE)
      .where({
        assignment_id: assignmentId,
        deleted_at: null
      })
      .whereBetween('date', [startDate, endDate])
      .orderBy('date', 'asc');
  },

  create(data) {
    return db(TABLE).insert(data);
  },

  upsert(data) {
    return db(TABLE).insert(data).onConflict(['assignment_id', 'student_id', 'date']).merge();
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

  bulkCreate(records) {
    return db(TABLE).insert(records);
  },

  bulkUpsert(records) {
    return db(TABLE).insert(records).onConflict(['assignment_id', 'student_id', 'date']).merge();
  }
};

module.exports = Attendance;
