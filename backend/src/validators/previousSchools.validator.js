// FILE: backend/src/validators/previousSchools.validator.js
const { body, param, query } = require('express-validator');

const previousSchoolsValidators = {
  create: [
    body('student_id').isInt().withMessage('Student ID must be an integer'),
    body('school_name').isString().notEmpty().withMessage('School name is required'),
    body('address').optional().isString().withMessage('Address must be a string'),
    body('phone').optional().isString().withMessage('Phone must be a string'),
    body('grade_level').optional().isString().withMessage('Grade level must be a string'),
    body('year_attended').optional().isString().withMessage('Year attended must be a string'),
    body('transcript_received').optional().isBoolean().withMessage('Transcript received must be a boolean'),
    body('notes').optional().isString().withMessage('Notes must be a string'),
  ],
  update: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('school_name').optional().isString().notEmpty().withMessage('School name must be a non-empty string'),
    body('address').optional().isString().withMessage('Address must be a string'),
    body('phone').optional().isString().withMessage('Phone must be a string'),
    body('grade_level').optional().isString().withMessage('Grade level must be a string'),
    body('year_attended').optional().isString().withMessage('Year attended must be a string'),
    body('transcript_received').optional().isBoolean().withMessage('Transcript received must be a boolean'),
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
    query('schoolName').optional().isString().withMessage('School name must be a string'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Page size must be between 1 and 100'),
  ],
};

module.exports = previousSchoolsValidators;