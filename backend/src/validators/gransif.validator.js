// FILE: backend/src/validators/gransif.validator.js
const { body, param, query } = require('express-validator');

const gransifValidators = {
  create: [
    body('student_id').isInt().withMessage('Student ID must be an integer'),
    body('academic_year_id').isInt().withMessage('Academic year ID must be an integer'),
    body('assessment_date').isISO8601().withMessage('Assessment date must be a valid date'),
    body('score').optional({ values: 'null' }).isFloat({ min: 0, max: 100 }).withMessage('Score must be between 0 and 100'),
    body('status').optional({ values: 'null' }).isIn(['PENDING', 'ACTIVE', 'COMPLETED']).withMessage('Invalid status'),
    body('notes').optional({ values: 'null' }).isString().withMessage('Notes must be a string'),
  ],
  update: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('assessment_date').optional({ values: 'null' }).isISO8601().withMessage('Assessment date must be a valid date'),
    body('score').optional({ values: 'null' }).isFloat({ min: 0, max: 100 }).withMessage('Score must be between 0 and 100'),
    body('status').optional({ values: 'null' }).isIn(['PENDING', 'ACTIVE', 'COMPLETED']).withMessage('Invalid status'),
    body('notes').optional({ values: 'null' }).isString().withMessage('Notes must be a string'),
  ],
  activate: [
    param('id').isInt().withMessage('ID must be an integer'),
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
    query('academicYearId').optional({ values: 'null' }).isInt().withMessage('Academic year ID must be an integer'),
    query('status').optional({ values: 'null' }).isIn(['PENDING', 'ACTIVE', 'COMPLETED']).withMessage('Invalid status'),
    query('page').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional({ values: 'null' }).isInt({ min: 1, max: 1000 }).withMessage('Page size must be between 1 and 1000'),
  ],
};

module.exports = gransifValidators;