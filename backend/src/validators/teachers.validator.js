// FILE: backend/src/validators/teachers.validator.js
const { body, param, query } = require('express-validator');

const teachersValidators = {
  create: [
    body('first_name').isString().notEmpty().withMessage('First name is required'),
    body('last_name').isString().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').optional().isString().withMessage('Phone must be a string'),
    body('specialization').optional().isString().withMessage('Specialization must be a string'),
    body('hire_date').optional().isISO8601().withMessage('Hire date must be a valid date'),
    body('branch_id').isInt().withMessage('Branch ID must be an integer'),
    body('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
  ],
  update: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('first_name').optional().isString().notEmpty().withMessage('First name must be a non-empty string'),
    body('last_name').optional().isString().notEmpty().withMessage('Last name must be a non-empty string'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('phone').optional().isString().withMessage('Phone must be a string'),
    body('specialization').optional().isString().withMessage('Specialization must be a string'),
    body('hire_date').optional().isISO8601().withMessage('Hire date must be a valid date'),
    body('branch_id').optional().isInt().withMessage('Branch ID must be an integer'),
    body('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
  ],
  getAssignments: [
    param('id').isInt().withMessage('ID must be an integer'),
    query('academicYearId').optional().isInt().withMessage('Academic year ID must be an integer'),
  ],
  findById: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  softDelete: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  findAll: [
    query('firstName').optional().isString().withMessage('First name must be a string'),
    query('lastName').optional().isString().withMessage('Last name must be a string'),
    query('email').optional().isString().withMessage('Email must be a string'),
    query('branchId').optional().isInt().withMessage('Branch ID must be an integer'),
    query('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
    query('search').optional().isString().withMessage('Search must be a string'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Page size must be between 1 and 100'),
  ],
};

module.exports = teachersValidators;