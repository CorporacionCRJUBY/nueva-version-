// FILE: backend/src/services/attendance.service.js
const db = require('../config/database');
const AppError = require('../utils/AppError');
const repository = require('../repositories/attendance.repository');
const { generateCode } = require('../utils/codeGenerator');
const auditService = require('./audit.service');
const { pick } = require('../utils/pick');
// FIX (auditoria hallazgo C1 - aislamiento por sede)
const { scopeFiltersToUserBranches, assertBranchAccess } = require('../utils/branchScope');

// FIX (auditoria hallazgo #5 - mass assignment): whitelist explícita de
// columnas reales de la tabla que el cliente puede escribir. Cualquier
// otro campo del body se ignora en vez de llegar crudo al INSERT/UPDATE.
const ALLOWED_FIELDS = ['assignment_id', 'student_id', 'date', 'status', 'check_in_time', 'check_out_time', 'notes'];

const WEEKDAY_NAMES = ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'];

/**
 * Rule 3 (Attendance): "Los docentes podrán modificar asistencia sin
 * límite de 24 horas, siempre que tengan permiso sobre el registro" —
 * i.e. a TEACHER may edit any date's attendance, but only for assignments
 * they own. ADMIN/SUPER_ADMIN act on the administration's explicit
 * authority and are not restricted to a single assignment.
 */
const assertCanEditAttendance = async (assignmentId, user) => {
  const roles = user?.roles || [];
  if (roles.includes('SUPER_ADMIN') || roles.includes('ADMIN')) return;

  if (roles.includes('TEACHER')) {
    const assignment = await db('academic_assignments')
      .join('teachers', 'academic_assignments.teacher_id', 'teachers.id')
      .where('academic_assignments.id', assignmentId)
      .select('teachers.user_id')
      .first();

    if (assignment && assignment.user_id === user.id) return;

    const error = new AppError('You do not have permission to modify attendance for this assignment.', 403);
    error.code = 'ATTENDANCE_NOT_OWNER';
    throw error;
  }
};

const AttendanceService = {
  async findAll(filters, user) {
    const { page = 1, pageSize = 20, search, assignmentId, studentId, dateFrom, dateTo, status } = filters;
    const queryFilters = scopeFiltersToUserBranches({ search, assignmentId, studentId, dateFrom, dateTo, status }, user);
    const [data, total] = await Promise.all([
      repository.findAll({ ...queryFilters, page, pageSize }),
      repository.count(queryFilters),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  },

  async findById(id, user) {
    const record = await repository.findById(id);
    assertBranchAccess(record, user, 'Attendance record not found');
    return record;
  },

  async create(payload, user, req) {
    // FIX (aislamiento por sede/propiedad): create() era el único método de
    // escritura del módulo que no llamaba a assertCanEditAttendance — un
    // TEACHER podía crear asistencia para una asignación ajena por esta vía,
    // aunque update()/softDelete()/saveDaily() ya lo bloqueaban.
    if (!payload.assignment_id) throw new AppError('assignment_id is required', 400);
    await assertCanEditAttendance(payload.assignment_id, user);
    const code = await generateCode('ATT');
    const data = {
      ...pick(payload, ALLOWED_FIELDS),
      code,
      created_by: user.id,
      updated_by: user.id
    };
    const [id] = await repository.create(data);
    const record = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'CREATE',
      module: 'attendance',
      recordCode: code,
      after: record,
      req
    });
    
    return record;
  },

  async update(id, payload, user, req) {
    const existing = await repository.findById(id);
    assertBranchAccess(existing, user, 'Attendance record not found');
    await assertCanEditAttendance(existing.assignment_id, user);

    const before = { ...existing };
    await repository.update(id, { ...pick(payload, ALLOWED_FIELDS), updated_by: user.id });
    const after = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'UPDATE',
      module: 'attendance',
      recordCode: existing.code,
      before,
      after,
      req
    });
    
    return after;
  },

  async softDelete(id, user, req) {
    const existing = await repository.findById(id);
    assertBranchAccess(existing, user, 'Attendance record not found');
    await assertCanEditAttendance(existing.assignment_id, user);

    await repository.softDelete(id, user.id);
    
    await auditService.log({
      user,
      action: 'DELETE',
      module: 'attendance',
      recordCode: existing.code,
      before: existing,
      req
    });
    
    return true;
  },

  async saveDaily(payload, user, req) {
    const { assignmentId, date, records } = payload;
    
    if (!assignmentId || !date || !records || !Array.isArray(records) || records.length === 0) {
      throw new AppError('Invalid daily attendance data', 400);
    }
    await assertCanEditAttendance(assignmentId, user);

    const preparedRecords = await Promise.all(records.map(async (record) => {
      const code = await generateCode('ATT');
      return {
        assignment_id: assignmentId,
        student_id: record.student_id,
        date,
        status: record.status || 'P',
        check_in_time: record.check_in_time || null,
        check_out_time: record.check_out_time || null,
        notes: record.notes || null,
        code,
        created_by: user.id,
        updated_by: user.id,
        created_at: new Date(),
        updated_at: new Date()
      };
    }));
    
    await repository.bulkUpsert(preparedRecords);
    const savedRecords = await repository.findDaily(assignmentId, date);
    
    await auditService.log({
      user,
      action: 'SAVE_DAILY',
      module: 'attendance',
      recordCode: `ATT-DAILY-${assignmentId}-${date}`,
      after: { assignmentId, date, count: savedRecords.length },
      req
    });
    
    return savedRecords;
  },

  async getMonthlyGrid(filters, user) {
    const { assignmentId, year: rawYear, month: rawMonth } = filters;
    const year = parseInt(rawYear, 10);
    const month = parseInt(rawMonth, 10);

    if (!assignmentId || !year || !month) {
      throw new AppError('assignmentId, year, and month are required', 400);
    }

    // 1. Obtener la asignación académica con profesor, materia, branch
    const assignment = await db('academic_assignments')
      .join('subjects', 'academic_assignments.subject_id', 'subjects.id')
      .join('teachers', 'academic_assignments.teacher_id', 'teachers.id')
      .join('branches', 'academic_assignments.branch_id', 'branches.id')
      .where('academic_assignments.id', assignmentId)
      .whereNull('academic_assignments.deleted_at')
      .select(
        'academic_assignments.*',
        'subjects.name as subject_name',
        'subjects.code as subject_code',
        db.raw("CONCAT(teachers.first_name, ' ', teachers.last_name) as teacher_name"),
        'branches.name as branch_name'
      )
      .first();

    if (!assignment) {
      throw new AppError('Academic assignment not found', 404);
    }

    // 2. Calcular días del mes real
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = [];

    // Obtener feriados / no clases del calendario escolar para ese mes
    const paddedMonth = String(month).padStart(2, '0');
    const startDate = `${year}-${paddedMonth}-01`;
    const endDate = `${year}-${paddedMonth}-${String(daysInMonth).padStart(2, '0')}`;

    const calendarEvents = await db('school_calendar')
      .whereBetween('date', [startDate, endDate])
      .whereNull('deleted_at');

    const holidayMap = {};
    calendarEvents.forEach(e => {
      holidayMap[e.date] = e.title;
    });

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month - 1, day);
      const dayOfWeek = dateObj.getDay();
      const dateStr = `${year}-${paddedMonth}-${String(day).padStart(2, '0')}`;
      const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
      const isHoliday = !!holidayMap[dateStr];

      days.push({
        dayNumber: day,
        date: dateStr,
        weekday: WEEKDAY_NAMES[dayOfWeek],
        isWeekend,
        isHoliday,
        holidayTitle: holidayMap[dateStr] || null
      });
    }

    // 3. Obtener los estudiantes del grado y sección de la asignación
    let students = await db('students')
      .where({
        grade: assignment.grade,
        branch_id: assignment.branch_id,
        status: 'ACTIVE'
      })
      .whereNull('deleted_at')
      .modify((qb) => {
        if (assignment.section) {
          qb.where('section', assignment.section);
        }
      })
      .select('id', 'code', 'first_name', 'last_name', 'grade', 'section')
      .orderBy('last_name', 'asc');

    // 4. Obtener todos los registros de asistencia del mes
    const rawAttendance = await repository.findMonthly(assignmentId, year, month);

    const attendanceByStudent = {};
    rawAttendance.forEach(rec => {
      if (!attendanceByStudent[rec.student_id]) {
        attendanceByStudent[rec.student_id] = {};
      }
      const dayNum = parseInt(rec.date.split('-')[2], 10);
      attendanceByStudent[rec.student_id][dayNum] = rec.status;
    });

    // 5. Construir matriz con totales por estudiante
    const studentRows = students.map(student => {
      const records = attendanceByStudent[student.id] || {};
      let countP = 0;
      let countO = 0;
      let countE = 0;
      let countU = 0;

      days.forEach(day => {
        const st = records[day.dayNumber];
        if (st === 'P') countP++;
        else if (st === 'O') countO++;
        else if (st === 'E') countE++;
        else if (st === 'U') countU++;
      });

      const totalPresent = countP + countO;
      const totalAbsent = countE + countU;
      const totalRecorded = totalPresent + totalAbsent;
      const attendanceRate = totalRecorded > 0 ? ((totalPresent / totalRecorded) * 100).toFixed(1) : '100.0';

      return {
        ...student,
        fullName: `${student.last_name}, ${student.first_name}`,
        records,
        totals: {
          present: countP,
          online: countO,
          excused: countE,
          unexcused: countU,
          totalPresent,
          totalAbsent,
          attendanceRate: parseFloat(attendanceRate)
        }
      };
    });

    return {
      assignment,
      year,
      month,
      daysInMonth,
      days,
      students: studentRows
    };
  },

  async getStudentMonthlyReport(studentId, year, month) {
    const student = await db('students').where({ id: studentId, deleted_at: null }).first();
    if (!student) throw new AppError('Student not found', 404);

    const paddedMonth = String(month).padStart(2, '0');
    const daysInMonth = new Date(year, month, 0).getDate();
    const startDate = `${year}-${paddedMonth}-01`;
    const endDate = `${year}-${paddedMonth}-${String(daysInMonth).padStart(2, '0')}`;

    const records = await db('attendance_records')
      .join('academic_assignments', 'attendance_records.assignment_id', 'academic_assignments.id')
      .join('subjects', 'academic_assignments.subject_id', 'subjects.id')
      .where('attendance_records.student_id', studentId)
      .whereBetween('attendance_records.date', [startDate, endDate])
      .whereNull('attendance_records.deleted_at')
      .select(
        'attendance_records.*',
        'subjects.name as subject_name'
      );

    let countP = 0, countO = 0, countE = 0, countU = 0;
    records.forEach(r => {
      if (r.status === 'P') countP++;
      if (r.status === 'O') countO++;
      if (r.status === 'E') countE++;
      if (r.status === 'U') countU++;
    });

    const totalPresent = countP + countO;
    const totalRecorded = totalPresent + countE + countU;
    const attendanceRate = totalRecorded > 0 ? ((totalPresent / totalRecorded) * 100).toFixed(1) : '100.0';

    return {
      student,
      year,
      month,
      records,
      totals: {
        present: countP,
        online: countO,
        excused: countE,
        unexcused: countU,
        totalPresent,
        totalAbsent: countE + countU,
        attendanceRate: parseFloat(attendanceRate)
      }
    };
  }
};

module.exports = AttendanceService;
