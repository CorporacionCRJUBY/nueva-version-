// FILE: backend/src/validators/scholarships.validator.js
const { body, param, query } = require('express-validator');

const scholarshipsValidators = {
  create: [
    body('student_id').isInt().withMessage('Student ID must be an integer'),
    body('scholarship_type').isString().notEmpty().withMessage('Scholarship type is required'),
    body('percentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Percentage must be between 0 and 100'),
    body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    body('academic_year_id').isInt().withMessage('Academic year ID must be an integer'),
    body('start_date').isISO8601().withMessage('Start date must be a valid date'),
    body('end_date').isISO8601().withMessage('End date must be a valid date'),
    body('status').optional().isIn(['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED']).withMessage('Invalid status'),
    body('notes').optional().isString().withMessage('Notes must be a string'),
  ],
  update: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('scholarship_type').optional().isString().notEmpty().withMessage('Scholarship type must be a non-empty string'),
    body('percentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Percentage must be between 0 and 100'),
    body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    body('academic_year_id').optional().isInt().withMessage('Academic year ID must be an integer'),
    body('start_date').optional().isISO8601().withMessage('Start date must be a valid date'),
    body('end_date').optional().isISO8601().withMessage('End date must be a valid date'),
    body('status').optional().isIn(['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED']).withMessage('Invalid status'),
    body('notes').optional().isString().withMessage('Notes must be a string'),
  ],
  updateStatus: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('status').isIn(['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED']).withMessage('Invalid status'),
    body('reason').optional().isString().withMessage('Reason must be a string'),
  ],
  findById: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  softDelete: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  findAll: [
    query('studentId').optional().isInt().withMessage('Student ID must be an integer'),
    query('scholarshipType').optional().isString().withMessage('Scholarship type must be a string'),
    query('status').optional().isIn(['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED']).withMessage('Invalid status'),
    query('academicYearId').optional().isInt().withMessage('Academic year ID must be an integer'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Page size must be between 1 and 100'),
  ],
};

module.exports = scholarshipsValidators;