// FILE: backend/src/validators/branches.validator.js
const { body, param, query } = require('express-validator');

const branchesValidators = {
  create: [
    body('name').isString().notEmpty().withMessage('Name is required'),
    body('address').optional().isString().withMessage('Address must be a string'),
    body('phone').optional().isString().withMessage('Phone must be a string'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
  ],
  update: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('name').optional().isString().notEmpty().withMessage('Name must be a non-empty string'),
    body('address').optional().isString().withMessage('Address must be a string'),
    body('phone').optional().isString().withMessage('Phone must be a string'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
  ],
  findById: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  softDelete: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  findAll: [
    query('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
    query('search').optional().isString().withMessage('Search must be a string'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Page size must be between 1 and 100'),
  ],
};

module.exports = branchesValidators;