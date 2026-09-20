// FILE: backend/src/validators/graduation.validator.js
const { body, param, query } = require('express-validator');

const graduationValidators = {
  create: [
    body('student_id').isInt().withMessage('Student ID must be an integer'),
    body('academic_year_id').isInt().withMessage('Academic year ID must be an integer'),
    body('graduation_date').isISO8601().withMessage('Graduation date must be a valid date'),
    body('status').optional({ values: 'null' }).isIn(['PENDING', 'VALIDATED', 'COMPLETED']).withMessage('Invalid status'),
    body('requirements_met').optional({ values: 'null' }).isBoolean().withMessage('Requirements met must be a boolean'),
    body('validation_notes').optional({ values: 'null' }).isString().withMessage('Validation notes must be a string'),
    body('certificate_number').optional({ values: 'null' }).isString().withMessage('Certificate number must be a string'),
  ],
  update: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('graduation_date').optional({ values: 'null' }).isISO8601().withMessage('Graduation date must be a valid date'),
    body('status').optional({ values: 'null' }).isIn(['PENDING', 'VALIDATED', 'COMPLETED']).withMessage('Invalid status'),
    body('requirements_met').optional({ values: 'null' }).isBoolean().withMessage('Requirements met must be a boolean'),
    body('validation_notes').optional({ values: 'null' }).isString().withMessage('Validation notes must be a string'),
    body('certificate_number').optional({ values: 'null' }).isString().withMessage('Certificate number must be a string'),
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
    query('search').optional({ values: 'null' }).isString().withMessage('Search must be a string'),
    query('studentId').optional({ values: 'null' }).isInt().withMessage('Student ID must be an integer'),
    query('academicYearId').optional({ values: 'null' }).isInt().withMessage('Academic year ID must be an integer'),
    query('status').optional({ values: 'null' }).isIn(['PENDING', 'VALIDATED', 'COMPLETED']).withMessage('Invalid status'),
    query('page').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional({ values: 'null' }).isInt({ min: 1, max: 1000 }).withMessage('Page size must be between 1 and 1000'),
  ],
};

module.exports = graduationValidators;