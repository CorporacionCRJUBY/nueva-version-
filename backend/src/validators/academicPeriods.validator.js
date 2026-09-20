// FILE: backend/src/validators/academicPeriods.validator.js
const { body, param, query } = require('express-validator');

const academicPeriodsValidators = {
  create: [
    body('academic_year_id').isInt().withMessage('Academic year ID must be an integer'),
    body('name').isString().notEmpty().withMessage('Name is required'),
    body('start_date').isISO8601().withMessage('Start date must be a valid date'),
    body('end_date').isISO8601().withMessage('End date must be a valid date'),
    body('status').optional({ values: 'null' }).isIn(['OPEN', 'CLOSED', 'LOCKED']).withMessage('Invalid status'),
    body('grading_config').optional({ values: 'null' }).isObject().withMessage('Grading config must be an object'),
  ],
  update: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('name').optional({ values: 'null' }).isString().notEmpty().withMessage('Name must be a non-empty string'),
    body('start_date').optional({ values: 'null' }).isISO8601().withMessage('Start date must be a valid date'),
    body('end_date').optional({ values: 'null' }).isISO8601().withMessage('End date must be a valid date'),
    body('status').optional({ values: 'null' }).isIn(['OPEN', 'CLOSED', 'LOCKED']).withMessage('Invalid status'),
    body('grading_config').optional({ values: 'null' }).isObject().withMessage('Grading config must be an object'),
  ],
  findById: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  softDelete: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  close: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  lock: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  findAll: [
    query('academicYearId').optional({ values: 'null' }).isInt().withMessage('Academic year ID must be an integer'),
    query('status').optional({ values: 'null' }).isIn(['OPEN', 'CLOSED', 'LOCKED']).withMessage('Invalid status'),
    query('search').optional({ values: 'null' }).isString().withMessage('Search must be a string'),
    query('page').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional({ values: 'null' }).isInt({ min: 1, max: 1000 }).withMessage('Page size must be between 1 and 1000'),
  ],
};

module.exports = academicPeriodsValidators;