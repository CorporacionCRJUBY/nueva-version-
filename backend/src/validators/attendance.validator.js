// FILE: backend/src/validators/attendance.validator.js
const { body, param, query, oneOf } = require('express-validator');

/**
 * Unifica las dos formas en que llega la asignacion en la asistencia diaria
 * (`assignmentId` y `assignment_id`) en una sola, `assignmentId`, que es la
 * que consume el servicio. Se ejecuta al final del pipeline del validador.
 */
const normalizeDailyAssignment = (req, res, next) => {
  const b = req.body || {};
  if (b.assignmentId == null && b.assignment_id != null) {
    b.assignmentId = b.assignment_id;
  }
  next();
};

const VALID_STATUSES = ['P', 'O', 'E', 'U', 'T'];
const STATUS_MSG = 'Status must be P (Present), O (Online), E (Excused), U (Unexcused), or T (Tardy)';

const attendanceValidators = {
  create: [
    body('assignment_id').isInt().withMessage('Assignment ID must be an integer'),
    body('student_id').isInt().withMessage('Student ID must be an integer'),
    body('date').isISO8601().withMessage('Date must be a valid date'),
    body('status').isIn(VALID_STATUSES).withMessage(STATUS_MSG),
    body('check_in_time').optional({ values: 'null' }).isString().withMessage('Check in time must be a string'),
    body('check_out_time').optional({ values: 'null' }).isString().withMessage('Check out time must be a string'),
    body('notes').optional({ values: 'null' }).isString().withMessage('Notes must be a string'),
  ],
  saveDaily: [
    // BUG REAL CORREGIDO: el validador exigia `assignment_id` (snake_case)
    // mientras el servicio leia `assignmentId` (camelCase). Con la
    // validacion estricta, CUALQUIER peticion valida para uno de los dos
    // formatos era rechazada por el otro: guardar la asistencia del dia
    // fallaba siempre con "Validation failed". Se aceptan las dos formas y
    // la normalizacion a un unico contrato la hace el middleware de abajo,
    // de modo que el servicio siga recibiendo siempre `assignmentId`.
    oneOf([
      [body('assignmentId').isInt().withMessage('assignmentId must be an integer')],
      [body('assignment_id').isInt().withMessage('assignment_id must be an integer')],
    ], 'assignmentId (or assignment_id) is required'),
    body('date').isISO8601().withMessage('Date must be a valid date'),
    body('records').isArray({ min: 1 }).withMessage('Records must be a non-empty array'),
    body('records.*.student_id').isInt().withMessage('Each record must have a student ID'),
    body('records.*.status').isIn(VALID_STATUSES).withMessage(STATUS_MSG),
    body('records.*.check_in_time').optional({ values: 'null' }).isString().withMessage('Check in time must be a string'),
    body('records.*.check_out_time').optional({ values: 'null' }).isString().withMessage('Check out time must be a string'),
    body('records.*.notes').optional({ values: 'null' }).isString().withMessage('Notes must be a string'),
    normalizeDailyAssignment,
  ],
  update: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('status').optional({ values: 'null' }).isIn(VALID_STATUSES).withMessage(STATUS_MSG),
    body('check_in_time').optional({ values: 'null' }).isString().withMessage('Check in time must be a string'),
    body('check_out_time').optional({ values: 'null' }).isString().withMessage('Check out time must be a string'),
    body('notes').optional({ values: 'null' }).isString().withMessage('Notes must be a string'),
  ],
  getMonthlyGrid: [
    param('assignmentId').isInt().withMessage('Assignment ID must be an integer'),
    param('year').isInt({ min: 2000, max: 2100 }).withMessage('Year must be a valid year'),
    param('month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
  ],
  findById: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  softDelete: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  findAll: [
    query('assignmentId').optional({ values: 'null' }).isInt().withMessage('Assignment ID must be an integer'),
    query('studentId').optional({ values: 'null' }).isInt().withMessage('Student ID must be an integer'),
    query('dateFrom').optional({ values: 'null' }).isISO8601().withMessage('Date from must be a valid date'),
    query('dateTo').optional({ values: 'null' }).isISO8601().withMessage('Date to must be a valid date'),
    query('page').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional({ values: 'null' }).isInt({ min: 1, max: 1000 }).withMessage('Page size must be between 1 and 1000'),
  ],
};

module.exports = attendanceValidators;
