// FILE: backend/src/validators/credits.validator.js
const { body, param, query } = require('express-validator');

const creditsValidators = {
  create: [
    body('student_id').isInt().withMessage('Student ID must be an integer'),
    body('academic_period_id').isInt().withMessage('Academic period ID must be an integer'),
    body('credit_type').isIn(['ACADEMIC', 'SOCIAL', 'COMMUNITY', 'ELECTIVE']).withMessage('Invalid credit type'),
    body('credits_earned').isFloat({ min: 0 }).withMessage('Credits earned must be a positive number'),
    body('credits_required').optional({ values: 'null' }).isFloat({ min: 0 }).withMessage('Credits required must be a positive number'),
    body('status').optional({ values: 'null' }).isIn(['PENDING', 'APPROVED', 'REJECTED']).withMessage('Invalid status'),
    body('notes').optional({ values: 'null' }).isString().withMessage('Notes must be a string'),
  ],
  update: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('credit_type').optional({ values: 'null' }).isIn(['ACADEMIC', 'SOCIAL', 'COMMUNITY', 'ELECTIVE']).withMessage('Invalid credit type'),
    body('credits_earned').optional({ values: 'null' }).isFloat({ min: 0 }).withMessage('Credits earned must be a positive number'),
    body('credits_required').optional({ values: 'null' }).isFloat({ min: 0 }).withMessage('Credits required must be a positive number'),
    body('status').optional({ values: 'null' }).isIn(['PENDING', 'APPROVED', 'REJECTED']).withMessage('Invalid status'),
    body('notes').optional({ values: 'null' }).isString().withMessage('Notes must be a string'),
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
    query('search').optional({ values: 'null' }).isString().withMessage('Search must be a string'),
    query('studentId').optional({ values: 'null' }).isInt().withMessage('Student ID must be an integer'),
    query('academicPeriodId').optional({ values: 'null' }).isInt().withMessage('Academic period ID must be an integer'),
    query('creditType').optional({ values: 'null' }).isIn(['ACADEMIC', 'SOCIAL', 'COMMUNITY', 'ELECTIVE']).withMessage('Invalid credit type'),
    query('status').optional({ values: 'null' }).isIn(['PENDING', 'APPROVED', 'REJECTED']).withMessage('Invalid status'),
    query('page').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional({ values: 'null' }).isInt({ min: 1, max: 1000 }).withMessage('Page size must be between 1 and 1000'),
  ],
};

module.exports = creditsValidators;