// FILE: backend/src/validators/credits.validator.js
const { body, param, query } = require('express-validator');

const creditsValidators = {
  create: [
    body('student_id').isInt().withMessage('Student ID must be an integer'),
    body('academic_period_id').isInt().withMessage('Academic period ID must be an integer'),
    body('credit_type').isIn(['ACADEMIC', 'SOCIAL', 'COMMUNITY', 'ELECTIVE']).withMessage('Invalid credit type'),
    body('credits_earned').isFloat({ min: 0 }).withMessage('Credits earned must be a positive number'),
    body('credits_required').optional().isFloat({ min: 0 }).withMessage('Credits required must be a positive number'),
    body('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED']).withMessage('Invalid status'),
    body('notes').optional().isString().withMessage('Notes must be a string'),
  ],
  update: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('credit_type').optional().isIn(['ACADEMIC', 'SOCIAL', 'COMMUNITY', 'ELECTIVE']).withMessage('Invalid credit type'),
    body('credits_earned').optional().isFloat({ min: 0 }).withMessage('Credits earned must be a positive number'),
    body('credits_required').optional().isFloat({ min: 0 }).withMessage('Credits required must be a positive number'),
    body('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED']).withMessage('Invalid status'),
    body('notes').optional().isString().withMessage('Notes must be a string'),
  ],
  recalculate: [
    param('studentId').isInt().withMessage('Student ID must be an integer'),
  ],
  findById: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  softDelete: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  findAll: [
    query('search').optional().isString().withMessage('Search must be a string'),
    query('studentId').optional().isInt().withMessage('Student ID must be an integer'),
    query('academicPeriodId').optional().isInt().withMessage('Academic period ID must be an integer'),
    query('creditType').optional().isIn(['ACADEMIC', 'SOCIAL', 'COMMUNITY', 'ELECTIVE']).withMessage('Invalid credit type'),
    query('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED']).withMessage('Invalid status'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Page size must be between 1 and 100'),
  ],
};

module.exports = creditsValidators;