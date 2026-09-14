// FILE: backend/src/validators/guardians.validator.js
const { body, param, query } = require('express-validator');

const guardiansValidators = {
  create: [
    body('student_id').isInt().withMessage('Student ID must be an integer'),
    body('first_name').isString().notEmpty().withMessage('First name is required'),
    body('last_name').isString().notEmpty().withMessage('Last name is required'),
    body('relationship').isString().notEmpty().withMessage('Relationship is required'),
    body('identification').optional().isString().withMessage('Identification must be a string'),
    body('phone').optional().isString().withMessage('Phone must be a string'),
    body('secondary_phone').optional().isString().withMessage('Secondary phone must be a string'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('address').optional().isString().withMessage('Address must be a string'),
    body('is_emergency_contact').optional().isBoolean().withMessage('Is emergency contact must be a boolean'),
    body('is_primary').optional().isBoolean().withMessage('Is primary must be a boolean'),
    body('authorized_pickup').optional().isBoolean().withMessage('Authorized pickup must be a boolean'),
    body('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
    body('notes').optional().isString().withMessage('Notes must be a string'),
  ],
  update: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('student_id').optional().isInt().withMessage('Student ID must be an integer'),
    body('first_name').optional().isString().notEmpty().withMessage('First name must be a non-empty string'),
    body('last_name').optional().isString().notEmpty().withMessage('Last name must be a non-empty string'),
    body('relationship').optional().isString().notEmpty().withMessage('Relationship must be a non-empty string'),
    body('identification').optional().isString().withMessage('Identification must be a string'),
    body('phone').optional().isString().withMessage('Phone must be a string'),
    body('secondary_phone').optional().isString().withMessage('Secondary phone must be a string'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('address').optional().isString().withMessage('Address must be a string'),
    body('is_emergency_contact').optional().isBoolean().withMessage('Is emergency contact must be a boolean'),
    body('is_primary').optional().isBoolean().withMessage('Is primary must be a boolean'),
    body('authorized_pickup').optional().isBoolean().withMessage('Authorized pickup must be a boolean'),
    body('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
    body('notes').optional().isString().withMessage('Notes must be a string'),
  ],
  getByStudent: [
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
    query('relationship').optional().isString().withMessage('Relationship must be a string'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Page size must be between 1 and 100'),
  ],
};

module.exports = guardiansValidators;