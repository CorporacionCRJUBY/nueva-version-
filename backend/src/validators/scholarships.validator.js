// FILE: backend/src/validators/scholarships.validator.js
const { body, param, query } = require('express-validator');

const scholarshipsValidators = {
  create: [
    body('student_id').isInt().withMessage('Student ID must be an integer'),
    body('scholarship_type').isString().notEmpty().withMessage('Scholarship type is required'),
    body('percentage').optional({ values: 'null' }).isFloat({ min: 0, max: 100 }).withMessage('Percentage must be between 0 and 100'),
    body('amount').optional({ values: 'null' }).isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    body('academic_year_id').isInt().withMessage('Academic year ID must be an integer'),
    body('start_date').isISO8601().withMessage('Start date must be a valid date'),
    body('end_date').isISO8601().withMessage('End date must be a valid date'),
    body('status').optional({ values: 'null' }).isIn(['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED']).withMessage('Invalid status'),
    body('notes').optional({ values: 'null' }).isString().withMessage('Notes must be a string'),
  ],
  update: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('scholarship_type').optional({ values: 'null' }).isString().notEmpty().withMessage('Scholarship type must be a non-empty string'),
    body('percentage').optional({ values: 'null' }).isFloat({ min: 0, max: 100 }).withMessage('Percentage must be between 0 and 100'),
    body('amount').optional({ values: 'null' }).isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    body('academic_year_id').optional({ values: 'null' }).isInt().withMessage('Academic year ID must be an integer'),
    body('start_date').optional({ values: 'null' }).isISO8601().withMessage('Start date must be a valid date'),
    body('end_date').optional({ values: 'null' }).isISO8601().withMessage('End date must be a valid date'),
    body('status').optional({ values: 'null' }).isIn(['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED']).withMessage('Invalid status'),
    body('notes').optional({ values: 'null' }).isString().withMessage('Notes must be a string'),
  ],
  updateStatus: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('status').isIn(['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED']).withMessage('Invalid status'),
    body('reason').optional({ values: 'null' }).isString().withMessage('Reason must be a string'),
  ],
  findById: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  softDelete: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  findAll: [
    query('studentId').optional({ values: 'null' }).isInt().withMessage('Student ID must be an integer'),
    query('scholarshipType').optional({ values: 'null' }).isString().withMessage('Scholarship type must be a string'),
    query('status').optional({ values: 'null' }).isIn(['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED']).withMessage('Invalid status'),
    query('academicYearId').optional({ values: 'null' }).isInt().withMessage('Academic year ID must be an integer'),
    query('page').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional({ values: 'null' }).isInt({ min: 1, max: 1000 }).withMessage('Page size must be between 1 and 1000'),
  ],
};

module.exports = scholarshipsValidators;