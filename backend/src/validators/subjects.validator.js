// FILE: backend/src/validators/subjects.validator.js
const { body, param, query } = require('express-validator');

const subjectsValidators = {
  create: [
    body('name').isString().notEmpty().withMessage('Name is required'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('grade').isString().notEmpty().withMessage('Grade is required'),
    body('branch_id').isInt().withMessage('Branch ID must be an integer'),
    body('credits').optional().isFloat({ min: 0 }).withMessage('Credits must be a positive number'),
    body('hours_per_week').optional().isFloat({ min: 0 }).withMessage('Hours per week must be a positive number'),
    body('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
  ],
  update: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('name').optional().isString().notEmpty().withMessage('Name must be a non-empty string'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('grade').optional().isString().withMessage('Grade must be a string'),
    body('branch_id').optional().isInt().withMessage('Branch ID must be an integer'),
    body('credits').optional().isFloat({ min: 0 }).withMessage('Credits must be a positive number'),
    body('hours_per_week').optional().isFloat({ min: 0 }).withMessage('Hours per week must be a positive number'),
    body('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
  ],
  findById: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  softDelete: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  findAll: [
    query('name').optional().isString().withMessage('Name must be a string'),
    query('code').optional().isString().withMessage('Code must be a string'),
    query('grade').optional().isString().withMessage('Grade must be a string'),
    query('branchId').optional().isInt().withMessage('Branch ID must be an integer'),
    query('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
    query('search').optional().isString().withMessage('Search must be a string'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Page size must be between 1 and 100'),
  ],
};

module.exports = subjectsValidators;