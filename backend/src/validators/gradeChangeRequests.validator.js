// FILE: backend/src/validators/gradeChangeRequests.validator.js
const { body, param, query } = require('express-validator');

const gradeChangeRequestsValidators = {
  create: [
    body('grade_record_id').isInt().withMessage('Grade record ID must be an integer'),
    body('student_id').isInt().withMessage('Student ID must be an integer'),
    body('current_grade').isFloat({ min: 0, max: 100 }).withMessage('Current grade must be between 0 and 100'),
    body('requested_grade').isFloat({ min: 0, max: 100 }).withMessage('Requested grade must be between 0 and 100'),
    body('reason').isString().notEmpty().withMessage('Reason is required'),
  ],
  update: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('current_grade').optional({ values: 'null' }).isFloat({ min: 0, max: 100 }).withMessage('Current grade must be between 0 and 100'),
    body('requested_grade').optional({ values: 'null' }).isFloat({ min: 0, max: 100 }).withMessage('Requested grade must be between 0 and 100'),
    body('reason').optional({ values: 'null' }).isString().withMessage('Reason must be a string'),
  ],
  approve: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('notes').optional({ values: 'null' }).isString().withMessage('Notes must be a string'),
  ],
  reject: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('notes').optional({ values: 'null' }).isString().withMessage('Notes must be a string'),
  ],
  findById: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  softDelete: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  findAll: [
    query('studentId').optional({ values: 'null' }).isInt().withMessage('Student ID must be an integer'),
    query('gradeRecordId').optional({ values: 'null' }).isInt().withMessage('Grade record ID must be an integer'),
    query('status').optional({ values: 'null' }).isIn(['PENDING', 'APPROVED', 'REJECTED']).withMessage('Invalid status'),
    query('dateFrom').optional({ values: 'null' }).isISO8601().withMessage('Date from must be a valid date'),
    query('dateTo').optional({ values: 'null' }).isISO8601().withMessage('Date to must be a valid date'),
    query('page').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional({ values: 'null' }).isInt({ min: 1, max: 1000 }).withMessage('Page size must be between 1 and 1000'),
  ],
};

module.exports = gradeChangeRequestsValidators;