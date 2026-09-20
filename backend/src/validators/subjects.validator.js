// FILE: backend/src/validators/subjects.validator.js
const { body, param, query } = require('express-validator');

const subjectsValidators = {
  create: [
    body('name').isString().notEmpty().withMessage('Name is required'),
    body('description').optional({ values: 'null' }).isString().withMessage('Description must be a string'),
    body('grade').isString().notEmpty().withMessage('Grade is required'),
    body('branch_id').isInt().withMessage('Branch ID must be an integer'),
    body('credits').optional({ values: 'null' }).isFloat({ min: 0 }).withMessage('Credits must be a positive number'),
    body('hours_per_week').optional({ values: 'null' }).isFloat({ min: 0 }).withMessage('Hours per week must be a positive number'),
    body('status').optional({ values: 'null' }).isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
  ],
  update: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('name').optional({ values: 'null' }).isString().notEmpty().withMessage('Name must be a non-empty string'),
    body('description').optional({ values: 'null' }).isString().withMessage('Description must be a string'),
    body('grade').optional({ values: 'null' }).isString().withMessage('Grade must be a string'),
    body('branch_id').optional({ values: 'null' }).isInt().withMessage('Branch ID must be an integer'),
    body('credits').optional({ values: 'null' }).isFloat({ min: 0 }).withMessage('Credits must be a positive number'),
    body('hours_per_week').optional({ values: 'null' }).isFloat({ min: 0 }).withMessage('Hours per week must be a positive number'),
    body('status').optional({ values: 'null' }).isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
  ],
  findById: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  softDelete: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  findAll: [
    query('name').optional({ values: 'null' }).isString().withMessage('Name must be a string'),
    query('code').optional({ values: 'null' }).isString().withMessage('Code must be a string'),
    query('grade').optional({ values: 'null' }).isString().withMessage('Grade must be a string'),
    query('branchId').optional({ values: 'null' }).isInt().withMessage('Branch ID must be an integer'),
    query('status').optional({ values: 'null' }).isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
    query('search').optional({ values: 'null' }).isString().withMessage('Search must be a string'),
    query('page').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional({ values: 'null' }).isInt({ min: 1, max: 1000 }).withMessage('Page size must be between 1 and 1000'),
  ],
};

module.exports = subjectsValidators;