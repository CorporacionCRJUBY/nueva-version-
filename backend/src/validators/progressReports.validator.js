// FILE: backend/src/validators/progressReports.validator.js
const { body, param, query } = require('express-validator');

const progressReportsValidators = {
  create: [
    body('student_id').isInt().withMessage('Student ID must be an integer'),
    body('academic_period_id').isInt().withMessage('Academic period ID must be an integer'),
    body('academic_year_id').isInt().withMessage('Academic year ID must be an integer'),
    body('report_date').optional().isISO8601().withMessage('Report date must be a valid date'),
    body('status').optional().isIn(['DRAFT', 'OFFICIAL', 'ARCHIVED']).withMessage('Invalid status'),
    body('notes').optional().isString().withMessage('Notes must be a string'),
  ],
  update: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('report_date').optional().isISO8601().withMessage('Report date must be a valid date'),
    body('status').optional().isIn(['DRAFT', 'OFFICIAL', 'ARCHIVED']).withMessage('Invalid status'),
    body('notes').optional().isString().withMessage('Notes must be a string'),
  ],
  generate: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  preview: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  findById: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  softDelete: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  findAll: [
    query('studentId').optional().isInt().withMessage('Student ID must be an integer'),
    query('academicPeriodId').optional().isInt().withMessage('Academic period ID must be an integer'),
    query('status').optional().isIn(['DRAFT', 'OFFICIAL', 'ARCHIVED']).withMessage('Invalid status'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Page size must be between 1 and 100'),
  ],
};

module.exports = progressReportsValidators;