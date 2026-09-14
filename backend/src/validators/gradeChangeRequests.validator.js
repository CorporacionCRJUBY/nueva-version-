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
    body('current_grade').optional().isFloat({ min: 0, max: 100 }).withMessage('Current grade must be between 0 and 100'),
    body('requested_grade').optional().isFloat({ min: 0, max: 100 }).withMessage('Requested grade must be between 0 and 100'),
    body('reason').optional().isString().withMessage('Reason must be a string'),
  ],
  approve: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('notes').optional().isString().withMessage('Notes must be a string'),
  ],
  reject: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('notes').optional().isString().withMessage('Notes must be a string'),
  ],
  findById: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  softDelete: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  findAll: [
    query('studentId').optional().isInt().withMessage('Student ID must be an integer'),
    query('gradeRecordId').optional().isInt().withMessage('Grade record ID must be an integer'),
    query('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED']).withMessage('Invalid status'),
    query('dateFrom').optional().isISO8601().withMessage('Date from must be a valid date'),
    query('dateTo').optional().isISO8601().withMessage('Date to must be a valid date'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Page size must be between 1 and 100'),
  ],
};

module.exports = gradeChangeRequestsValidators;