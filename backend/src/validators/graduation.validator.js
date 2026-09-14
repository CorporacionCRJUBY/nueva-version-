// FILE: backend/src/validators/graduation.validator.js
const { body, param, query } = require('express-validator');

const graduationValidators = {
  create: [
    body('student_id').isInt().withMessage('Student ID must be an integer'),
    body('academic_year_id').isInt().withMessage('Academic year ID must be an integer'),
    body('graduation_date').isISO8601().withMessage('Graduation date must be a valid date'),
    body('status').optional().isIn(['PENDING', 'VALIDATED', 'COMPLETED']).withMessage('Invalid status'),
    body('requirements_met').optional().isBoolean().withMessage('Requirements met must be a boolean'),
    body('validation_notes').optional().isString().withMessage('Validation notes must be a string'),
    body('certificate_number').optional().isString().withMessage('Certificate number must be a string'),
  ],
  update: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('graduation_date').optional().isISO8601().withMessage('Graduation date must be a valid date'),
    body('status').optional().isIn(['PENDING', 'VALIDATED', 'COMPLETED']).withMessage('Invalid status'),
    body('requirements_met').optional().isBoolean().withMessage('Requirements met must be a boolean'),
    body('validation_notes').optional().isString().withMessage('Validation notes must be a string'),
    body('certificate_number').optional().isString().withMessage('Certificate number must be a string'),
  ],
  validate: [
    param('studentId').isInt().withMessage('Student ID must be an integer'),
  ],
  findById: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  softDelete: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  findAll: [
    query('search').optional().isString().withMessage('Search must be a string'),
    query('studentId').optional().isInt().withMessage('Student ID must be an integer'),
    query('academicYearId').optional().isInt().withMessage('Academic year ID must be an integer'),
    query('status').optional().isIn(['PENDING', 'VALIDATED', 'COMPLETED']).withMessage('Invalid status'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Page size must be between 1 and 100'),
  ],
};

module.exports = graduationValidators;