// FILE: backend/src/validators/previousSchools.validator.js
const { body, param, query } = require('express-validator');

const previousSchoolsValidators = {
  create: [
    body('student_id').isInt().withMessage('Student ID must be an integer'),
    body('school_name').isString().notEmpty().withMessage('School name is required'),
    body('address').optional({ values: 'null' }).isString().withMessage('Address must be a string'),
    body('phone').optional({ values: 'null' }).isString().withMessage('Phone must be a string'),
    body('grade_level').optional({ values: 'null' }).isString().withMessage('Grade level must be a string'),
    body('year_attended').optional({ values: 'null' }).isString().withMessage('Year attended must be a string'),
    body('transcript_received').optional({ values: 'null' }).isBoolean().withMessage('Transcript received must be a boolean'),
    body('notes').optional({ values: 'null' }).isString().withMessage('Notes must be a string'),
  ],
  update: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('school_name').optional({ values: 'null' }).isString().notEmpty().withMessage('School name must be a non-empty string'),
    body('address').optional({ values: 'null' }).isString().withMessage('Address must be a string'),
    body('phone').optional({ values: 'null' }).isString().withMessage('Phone must be a string'),
    body('grade_level').optional({ values: 'null' }).isString().withMessage('Grade level must be a string'),
    body('year_attended').optional({ values: 'null' }).isString().withMessage('Year attended must be a string'),
    body('transcript_received').optional({ values: 'null' }).isBoolean().withMessage('Transcript received must be a boolean'),
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
    query('schoolName').optional({ values: 'null' }).isString().withMessage('School name must be a string'),
    query('page').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional({ values: 'null' }).isInt({ min: 1, max: 1000 }).withMessage('Page size must be between 1 and 1000'),
  ],
};

module.exports = previousSchoolsValidators;