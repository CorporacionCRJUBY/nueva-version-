// FILE: backend/src/validators/guardians.validator.js
const { body, param, query } = require('express-validator');

const guardiansValidators = {
  create: [
    body('student_id').isInt().withMessage('Student ID must be an integer'),
    body('first_name').isString().notEmpty().withMessage('First name is required'),
    body('last_name').isString().notEmpty().withMessage('Last name is required'),
    body('relationship').isString().notEmpty().withMessage('Relationship is required'),
    body('identification').optional({ values: 'null' }).isString().withMessage('Identification must be a string'),
    body('phone').optional({ values: 'null' }).isString().withMessage('Phone must be a string'),
    body('secondary_phone').optional({ values: 'null' }).isString().withMessage('Secondary phone must be a string'),
    body('email').optional({ values: 'null' }).isEmail().withMessage('Valid email is required'),
    body('address').optional({ values: 'null' }).isString().withMessage('Address must be a string'),
    body('is_emergency_contact').optional({ values: 'null' }).isBoolean().withMessage('Is emergency contact must be a boolean'),
    body('is_primary').optional({ values: 'null' }).isBoolean().withMessage('Is primary must be a boolean'),
    body('authorized_pickup').optional({ values: 'null' }).isBoolean().withMessage('Authorized pickup must be a boolean'),
    body('status').optional({ values: 'null' }).isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
    body('notes').optional({ values: 'null' }).isString().withMessage('Notes must be a string'),
  ],
  update: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('student_id').optional({ values: 'null' }).isInt().withMessage('Student ID must be an integer'),
    body('first_name').optional({ values: 'null' }).isString().notEmpty().withMessage('First name must be a non-empty string'),
    body('last_name').optional({ values: 'null' }).isString().notEmpty().withMessage('Last name must be a non-empty string'),
    body('relationship').optional({ values: 'null' }).isString().notEmpty().withMessage('Relationship must be a non-empty string'),
    body('identification').optional({ values: 'null' }).isString().withMessage('Identification must be a string'),
    body('phone').optional({ values: 'null' }).isString().withMessage('Phone must be a string'),
    body('secondary_phone').optional({ values: 'null' }).isString().withMessage('Secondary phone must be a string'),
    body('email').optional({ values: 'null' }).isEmail().withMessage('Valid email is required'),
    body('address').optional({ values: 'null' }).isString().withMessage('Address must be a string'),
    body('is_emergency_contact').optional({ values: 'null' }).isBoolean().withMessage('Is emergency contact must be a boolean'),
    body('is_primary').optional({ values: 'null' }).isBoolean().withMessage('Is primary must be a boolean'),
    body('authorized_pickup').optional({ values: 'null' }).isBoolean().withMessage('Authorized pickup must be a boolean'),
    body('status').optional({ values: 'null' }).isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
    body('notes').optional({ values: 'null' }).isString().withMessage('Notes must be a string'),
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
    query('search').optional({ values: 'null' }).isString().withMessage('Search must be a string'),
    query('studentId').optional({ values: 'null' }).isInt().withMessage('Student ID must be an integer'),
    query('relationship').optional({ values: 'null' }).isString().withMessage('Relationship must be a string'),
    query('page').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional({ values: 'null' }).isInt({ min: 1, max: 1000 }).withMessage('Page size must be between 1 and 1000'),
  ],
};

module.exports = guardiansValidators;