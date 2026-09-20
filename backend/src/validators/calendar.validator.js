// FILE: backend/src/validators/calendar.validator.js
const { body, param, query } = require('express-validator');

const calendarValidators = {
  create: [
    body('branch_id').optional({ values: 'falsy' }).isInt().withMessage('Branch ID must be an integer'),
    body('academic_year_id').optional({ values: 'falsy' }).isInt().withMessage('Academic year ID must be an integer'),
    body('date').isISO8601().withMessage('Date must be a valid date'),
    body('title').isString().notEmpty().withMessage('Title is required'),
    body('description').optional({ values: 'null' }).isString().withMessage('Description must be a string'),
    body('event_type').isIn(['HOLIDAY', 'EXAM', 'EVENT', 'MEETING', 'DEADLINE', 'OTHER']).withMessage('Invalid event type'),
    body('is_holiday').optional({ values: 'null' }).isBoolean().withMessage('Is holiday must be a boolean'),
    body('is_working_day').optional({ values: 'null' }).isBoolean().withMessage('Is working day must be a boolean'),
    body('status').optional({ values: 'null' }).isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
  ],
  update: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('branch_id').optional({ values: 'falsy' }).isInt().withMessage('Branch ID must be an integer'),
    body('academic_year_id').optional({ values: 'falsy' }).isInt().withMessage('Academic year ID must be an integer'),
    body('date').optional({ values: 'null' }).isISO8601().withMessage('Date must be a valid date'),
    body('title').optional({ values: 'null' }).isString().notEmpty().withMessage('Title must be a non-empty string'),
    body('description').optional({ values: 'null' }).isString().withMessage('Description must be a string'),
    body('event_type').optional({ values: 'null' }).isIn(['HOLIDAY', 'EXAM', 'EVENT', 'MEETING', 'DEADLINE', 'OTHER']).withMessage('Invalid event type'),
    body('is_holiday').optional({ values: 'null' }).isBoolean().withMessage('Is holiday must be a boolean'),
    body('is_working_day').optional({ values: 'null' }).isBoolean().withMessage('Is working day must be a boolean'),
    body('status').optional({ values: 'null' }).isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
  ],
  getByMonth: [
    param('year').isInt({ min: 2000, max: 2100 }).withMessage('Year must be a valid year'),
    param('month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
    query('branchId').optional({ values: 'null' }).isInt().withMessage('Branch ID must be an integer'),
    query('academicYearId').optional({ values: 'null' }).isInt().withMessage('Academic year ID must be an integer'),
    query('page').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional({ values: 'null' }).isInt({ min: 1, max: 1000 }).withMessage('Page size must be between 1 and 1000'),
  ],
  findById: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  softDelete: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  findAll: [
    query('search').optional({ values: 'null' }).isString().withMessage('Search must be a string'),
    query('year').optional({ values: 'null' }).isInt().withMessage('Year must be an integer'),
    query('month').optional({ values: 'null' }).isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
    query('branchId').optional({ values: 'null' }).isInt().withMessage('Branch ID must be an integer'),
    query('academicYearId').optional({ values: 'null' }).isInt().withMessage('Academic year ID must be an integer'),
    query('eventType').optional({ values: 'null' }).isIn(['HOLIDAY', 'EXAM', 'EVENT', 'MEETING', 'DEADLINE', 'OTHER']).withMessage('Invalid event type'),
    query('status').optional({ values: 'null' }).isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
    query('page').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional({ values: 'null' }).isInt({ min: 1, max: 1000 }).withMessage('Page size must be between 1 and 1000'),
  ],
};

module.exports = calendarValidators;