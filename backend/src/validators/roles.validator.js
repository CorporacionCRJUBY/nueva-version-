// FILE: backend/src/validators/roles.validator.js
const { body, param, query } = require('express-validator');

const rolesValidators = {
  create: [
    body('name').isString().notEmpty().withMessage('Name is required'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
  ],
  update: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('name').optional().isString().notEmpty().withMessage('Name must be a non-empty string'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
  ],
  assignPermissions: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('permissionIds').isArray().withMessage('Permission IDs must be an array'),
    body('permissionIds.*').isInt().withMessage('Each permission ID must be an integer'),
  ],
  findById: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  softDelete: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  findAll: [
    query('search').optional().isString().withMessage('Search must be a string'),
    query('name').optional().isString().withMessage('Name must be a string'),
    query('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Page size must be between 1 and 100'),
  ],
};

module.exports = rolesValidators;