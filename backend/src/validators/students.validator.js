// FILE: backend/src/validators/students.validator.js
const { body, param, query } = require('express-validator');

const studentsValidators = {
  create: [
    body('first_name').isString().notEmpty().withMessage('First name is required'),
    body('middle_name').optional({ values: 'null' }).isString().withMessage('Middle name must be a string'),
    body('last_name').isString().notEmpty().withMessage('Last name is required'),
    body('second_last_name').optional({ values: 'null' }).isString().withMessage('Second last name must be a string'),
    body('identification_type').optional({ values: 'null' }).isString().withMessage('Identification type must be a string'),
    body('identification_number').optional({ values: 'null' }).isString().withMessage('Identification number must be a string'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').optional({ values: 'null' }).isString().withMessage('Phone must be a string'),
    body('address').optional({ values: 'null' }).isString().withMessage('Address must be a string'),
    body('date_of_birth').isISO8601().withMessage('Date of birth must be a valid date'),
    body('gender').optional({ values: 'null' }).isIn(['M', 'F', 'OTHER']).withMessage('Invalid gender'),
    body('grade').isString().notEmpty().withMessage('Grade is required'),
    body('section').optional({ values: 'null' }).isString().withMessage('Section must be a string'),
    body('branch_id').isInt().withMessage('Branch ID must be an integer'),
    body('academic_year_id').isInt().withMessage('Academic year ID must be an integer'),
    body('enrollment_date').optional({ values: 'null' }).isISO8601().withMessage('Enrollment date must be a valid date'),
    body('graduation_year').optional({ values: 'null' }).isInt().withMessage('Graduation year must be an integer'),
    body('status').optional({ values: 'null' }).isIn(['ACTIVE', 'INACTIVE', 'GRADUATED', 'WITHDRAWN', 'TRANSFERRED', 'SUSPENDED']).withMessage('Invalid status'),
  ],
  update: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('first_name').optional({ values: 'null' }).isString().notEmpty().withMessage('First name must be a non-empty string'),
    body('middle_name').optional({ values: 'null' }).isString().withMessage('Middle name must be a string'),
    body('last_name').optional({ values: 'null' }).isString().notEmpty().withMessage('Last name must be a non-empty string'),
    body('second_last_name').optional({ values: 'null' }).isString().withMessage('Second last name must be a string'),
    body('identification_type').optional({ values: 'null' }).isString().withMessage('Identification type must be a string'),
    body('identification_number').optional({ values: 'null' }).isString().withMessage('Identification number must be a string'),
    body('email').optional({ values: 'null' }).isEmail().withMessage('Valid email is required'),
    body('phone').optional({ values: 'null' }).isString().withMessage('Phone must be a string'),
    body('address').optional({ values: 'null' }).isString().withMessage('Address must be a string'),
    body('date_of_birth').optional({ values: 'null' }).isISO8601().withMessage('Date of birth must be a valid date'),
    body('gender').optional({ values: 'null' }).isIn(['M', 'F', 'OTHER']).withMessage('Invalid gender'),
    body('grade').optional({ values: 'null' }).isString().withMessage('Grade must be a string'),
    body('section').optional({ values: 'null' }).isString().withMessage('Section must be a string'),
    body('branch_id').optional({ values: 'null' }).isInt().withMessage('Branch ID must be an integer'),
    body('academic_year_id').optional({ values: 'null' }).isInt().withMessage('Academic year ID must be an integer'),
    body('status').optional({ values: 'null' }).isIn(['ACTIVE', 'INACTIVE', 'GRADUATED', 'WITHDRAWN', 'TRANSFERRED', 'SUSPENDED']).withMessage('Invalid status'),
  ],
  updateStatus: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('status').isIn(['ACTIVE', 'INACTIVE', 'GRADUATED', 'WITHDRAWN', 'TRANSFERRED', 'SUSPENDED']).withMessage('Invalid status'),
    body('reason').optional({ values: 'null' }).isString().withMessage('Reason must be a string'),
    body('observation').optional({ values: 'null' }).isString().withMessage('Observation must be a string'),
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
    query('search').optional({ values: 'null' }).isString().withMessage('Search must be a string'),
    query('firstName').optional({ values: 'null' }).isString().withMessage('First name must be a string'),
    query('lastName').optional({ values: 'null' }).isString().withMessage('Last name must be a string'),
    query('email').optional({ values: 'null' }).isString().withMessage('Email must be a string'),
    query('grade').optional({ values: 'null' }).isString().withMessage('Grade must be a string'),
    query('section').optional({ values: 'null' }).isString().withMessage('Section must be a string'),
    query('branchId').optional({ values: 'null' }).isInt().withMessage('Branch ID must be an integer'),
    query('academicYearId').optional({ values: 'null' }).isInt().withMessage('Academic year ID must be an integer'),
    query('status').optional({ values: 'null' }).isIn(['ACTIVE', 'INACTIVE', 'GRADUATED', 'WITHDRAWN', 'TRANSFERRED', 'SUSPENDED']).withMessage('Invalid status'),
    query('page').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional({ values: 'null' }).isInt({ min: 1, max: 1000 }).withMessage('Page size must be between 1 and 1000'),
  ],
};

module.exports = studentsValidators;