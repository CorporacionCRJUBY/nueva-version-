// FILE: backend/src/validators/branches.validator.js
const { body, param, query } = require('express-validator');

const branchesValidators = {
  create: [
    body('name').isString().notEmpty().withMessage('Name is required'),
    body('address').optional({ values: 'null' }).isString().withMessage('Address must be a string'),
    body('phone').optional({ values: 'null' }).isString().withMessage('Phone must be a string'),
    body('email').optional({ values: 'null' }).isEmail().withMessage('Valid email is required'),
    body('status').optional({ values: 'null' }).isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
  ],
  update: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('name').optional({ values: 'null' }).isString().notEmpty().withMessage('Name must be a non-empty string'),
    body('address').optional({ values: 'null' }).isString().withMessage('Address must be a string'),
    body('phone').optional({ values: 'null' }).isString().withMessage('Phone must be a string'),
    body('email').optional({ values: 'null' }).isEmail().withMessage('Valid email is required'),
    body('status').optional({ values: 'null' }).isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
  ],
  findById: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  softDelete: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  findAll: [
    query('status').optional({ values: 'null' }).isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
    query('search').optional({ values: 'null' }).isString().withMessage('Search must be a string'),
    query('page').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional({ values: 'null' }).isInt({ min: 1, max: 1000 }).withMessage('Page size must be between 1 and 1000'),
  ],
};

module.exports = branchesValidators;