// FILE: backend/src/validators/permissions.validator.js
const { body, param, query } = require('express-validator');

const permissionsValidators = {
  create: [
    body('module').isString().notEmpty().withMessage('Module is required'),
    body('action').isString().notEmpty().withMessage('Action is required'),
    body('description').optional().isString().withMessage('Description must be a string'),
  ],
  update: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('module').optional().isString().notEmpty().withMessage('Module must be a non-empty string'),
    body('action').optional().isString().notEmpty().withMessage('Action must be a non-empty string'),
    body('description').optional().isString().withMessage('Description must be a string'),
  ],
  findById: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  softDelete: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  findAll: [
    query('search').optional().isString().withMessage('Search must be a string'),
    query('module').optional().isString().withMessage('Module must be a string'),
    query('action').optional().isString().withMessage('Action must be a string'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Page size must be between 1 and 100'),
  ],
};

module.exports = permissionsValidators;