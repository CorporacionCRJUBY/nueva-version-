// FILE: backend/src/validators/gpa.validator.js
const { body, param, query } = require('express-validator');

const gpaValidators = {
  create: [
    body('student_id').isInt().withMessage('Student ID must be an integer'),
    body('academic_period_id').isInt().withMessage('Academic period ID must be an integer'),
    body('academic_year_id').isInt().withMessage('Academic year ID must be an integer'),
    body('gpa_value').isFloat({ min: 0, max: 5 }).withMessage('GPA value must be between 0 and 5'),
    body('cumulative_gpa').optional({ values: 'null' }).isFloat({ min: 0, max: 5 }).withMessage('Cumulative GPA must be between 0 and 5'),
    body('credit_hours').optional({ values: 'null' }).isFloat({ min: 0 }).withMessage('Credit hours must be a positive number'),
    body('status').optional({ values: 'null' }).isIn(['PENDING', 'APPROVED']).withMessage('Invalid status'),
  ],
  update: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('gpa_value').optional({ values: 'null' }).isFloat({ min: 0, max: 5 }).withMessage('GPA value must be between 0 and 5'),
    body('cumulative_gpa').optional({ values: 'null' }).isFloat({ min: 0, max: 5 }).withMessage('Cumulative GPA must be between 0 and 5'),
    body('credit_hours').optional({ values: 'null' }).isFloat({ min: 0 }).withMessage('Credit hours must be a positive number'),
    body('status').optional({ values: 'null' }).isIn(['PENDING', 'APPROVED']).withMessage('Invalid status'),
  ],
  recalculate: [
    param('studentId').isInt().withMessage('Student ID must be an integer'),
  ],
  getCumulative: [
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
    query('academicYearId').optional({ values: 'null' }).isInt().withMessage('Academic year ID must be an integer'),
    query('status').optional({ values: 'null' }).isIn(['PENDING', 'APPROVED']).withMessage('Invalid status'),
    query('page').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional({ values: 'null' }).isInt({ min: 1, max: 1000 }).withMessage('Page size must be between 1 and 1000'),
  ],
};

module.exports = gpaValidators;