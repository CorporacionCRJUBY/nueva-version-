// FILE: backend/src/validators/students.validator.js
const { body, param, query } = require('express-validator');

const studentsValidators = {
  create: [
    body('first_name').isString().notEmpty().withMessage('First name is required'),
    body('middle_name').optional().isString().withMessage('Middle name must be a string'),
    body('last_name').isString().notEmpty().withMessage('Last name is required'),
    body('second_last_name').optional().isString().withMessage('Second last name must be a string'),
    body('identification_type').optional().isString().withMessage('Identification type must be a string'),
    body('identification_number').optional().isString().withMessage('Identification number must be a string'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').optional().isString().withMessage('Phone must be a string'),
    body('address').optional().isString().withMessage('Address must be a string'),
    body('date_of_birth').isISO8601().withMessage('Date of birth must be a valid date'),
    body('gender').optional().isIn(['M', 'F', 'OTHER']).withMessage('Invalid gender'),
    body('grade').isString().notEmpty().withMessage('Grade is required'),
    body('section').optional().isString().withMessage('Section must be a string'),
    body('branch_id').isInt().withMessage('Branch ID must be an integer'),
    body('academic_year_id').isInt().withMessage('Academic year ID must be an integer'),
    body('enrollment_date').optional().isISO8601().withMessage('Enrollment date must be a valid date'),
    body('graduation_year').optional().isInt().withMessage('Graduation year must be an integer'),
    body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'GRADUATED', 'WITHDRAWN', 'TRANSFERRED', 'SUSPENDED']).withMessage('Invalid status'),
  ],
  update: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('first_name').optional().isString().notEmpty().withMessage('First name must be a non-empty string'),
    body('middle_name').optional().isString().withMessage('Middle name must be a string'),
    body('last_name').optional().isString().notEmpty().withMessage('Last name must be a non-empty string'),
    body('second_last_name').optional().isString().withMessage('Second last name must be a string'),
    body('identification_type').optional().isString().withMessage('Identification type must be a string'),
    body('identification_number').optional().isString().withMessage('Identification number must be a string'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('phone').optional().isString().withMessage('Phone must be a string'),
    body('address').optional().isString().withMessage('Address must be a string'),
    body('date_of_birth').optional().isISO8601().withMessage('Date of birth must be a valid date'),
    body('gender').optional().isIn(['M', 'F', 'OTHER']).withMessage('Invalid gender'),
    body('grade').optional().isString().withMessage('Grade must be a string'),
    body('section').optional().isString().withMessage('Section must be a string'),
    body('branch_id').optional().isInt().withMessage('Branch ID must be an integer'),
    body('academic_year_id').optional().isInt().withMessage('Academic year ID must be an integer'),
    body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'GRADUATED', 'WITHDRAWN', 'TRANSFERRED', 'SUSPENDED']).withMessage('Invalid status'),
  ],
  updateStatus: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('status').isIn(['ACTIVE', 'INACTIVE', 'GRADUATED', 'WITHDRAWN', 'TRANSFERRED', 'SUSPENDED']).withMessage('Invalid status'),
    body('reason').optional().isString().withMessage('Reason must be a string'),
    body('observation').optional().isString().withMessage('Observation must be a string'),
  ],
  findById: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  getFullRecord: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  softDelete: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  findAll: [
    query('search').optional().isString().withMessage('Search must be a string'),
    query('firstName').optional().isString().withMessage('First name must be a string'),
    query('lastName').optional().isString().withMessage('Last name must be a string'),
    query('email').optional().isString().withMessage('Email must be a string'),
    query('grade').optional().isString().withMessage('Grade must be a string'),
    query('section').optional().isString().withMessage('Section must be a string'),
    query('branchId').optional().isInt().withMessage('Branch ID must be an integer'),
    query('academicYearId').optional().isInt().withMessage('Academic year ID must be an integer'),
    query('status').optional().isIn(['ACTIVE', 'INACTIVE', 'GRADUATED', 'WITHDRAWN', 'TRANSFERRED', 'SUSPENDED']).withMessage('Invalid status'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Page size must be between 1 and 100'),
  ],
};

module.exports = studentsValidators;