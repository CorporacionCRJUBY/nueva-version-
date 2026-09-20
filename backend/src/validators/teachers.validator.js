// FILE: backend/src/validators/teachers.validator.js
const { body, param, query } = require('express-validator');

const teachersValidators = {
  create: [
    body('first_name').isString().notEmpty().withMessage('First name is required'),
    body('last_name').isString().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').optional({ values: 'null' }).isString().withMessage('Phone must be a string'),
    body('specialization').optional({ values: 'null' }).isString().withMessage('Specialization must be a string'),
    body('hire_date').optional({ values: 'null' }).isISO8601().withMessage('Hire date must be a valid date'),
    body('branch_id').isInt().withMessage('Branch ID must be an integer'),
    body('status').optional({ values: 'null' }).isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
  ],
  update: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('first_name').optional({ values: 'null' }).isString().notEmpty().withMessage('First name must be a non-empty string'),
    body('last_name').optional({ values: 'null' }).isString().notEmpty().withMessage('Last name must be a non-empty string'),
    body('email').optional({ values: 'null' }).isEmail().withMessage('Valid email is required'),
    body('phone').optional({ values: 'null' }).isString().withMessage('Phone must be a string'),
    body('specialization').optional({ values: 'null' }).isString().withMessage('Specialization must be a string'),
    body('hire_date').optional({ values: 'null' }).isISO8601().withMessage('Hire date must be a valid date'),
    body('branch_id').optional({ values: 'null' }).isInt().withMessage('Branch ID must be an integer'),
    body('status').optional({ values: 'null' }).isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
  ],
  getAssignments: [
    param('id').isInt().withMessage('ID must be an integer'),
    query('academicYearId').optional({ values: 'null' }).isInt().withMessage('Academic year ID must be an integer'),
  ],
  findById: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  softDelete: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  findAll: [
    query('firstName').optional({ values: 'null' }).isString().withMessage('First name must be a string'),
    query('lastName').optional({ values: 'null' }).isString().withMessage('Last name must be a string'),
    query('email').optional({ values: 'null' }).isString().withMessage('Email must be a string'),
    query('branchId').optional({ values: 'null' }).isInt().withMessage('Branch ID must be an integer'),
    query('status').optional({ values: 'null' }).isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
    query('search').optional({ values: 'null' }).isString().withMessage('Search must be a string'),
    query('page').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional({ values: 'null' }).isInt({ min: 1, max: 1000 }).withMessage('Page size must be between 1 and 1000'),
  ],
};

module.exports = teachersValidators;