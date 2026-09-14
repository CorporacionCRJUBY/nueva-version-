// FILE: backend/src/validators/calendar.validator.js
const { body, param, query } = require('express-validator');

const calendarValidators = {
  create: [
    body('branch_id').optional({ checkFalsy: true, nullable: true }).isInt().withMessage('Branch ID must be an integer'),
    body('academic_year_id').optional({ checkFalsy: true, nullable: true }).isInt().withMessage('Academic year ID must be an integer'),
    body('date').isISO8601().withMessage('Date must be a valid date'),
    body('title').isString().notEmpty().withMessage('Title is required'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('event_type').isIn(['HOLIDAY', 'EXAM', 'EVENT', 'MEETING', 'DEADLINE', 'OTHER']).withMessage('Invalid event type'),
    body('is_holiday').optional().isBoolean().withMessage('Is holiday must be a boolean'),
    body('is_working_day').optional().isBoolean().withMessage('Is working day must be a boolean'),
    body('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
  ],
  update: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('branch_id').optional({ checkFalsy: true, nullable: true }).isInt().withMessage('Branch ID must be an integer'),
    body('academic_year_id').optional({ checkFalsy: true, nullable: true }).isInt().withMessage('Academic year ID must be an integer'),
    body('date').optional().isISO8601().withMessage('Date must be a valid date'),
    body('title').optional().isString().notEmpty().withMessage('Title must be a non-empty string'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('event_type').optional().isIn(['HOLIDAY', 'EXAM', 'EVENT', 'MEETING', 'DEADLINE', 'OTHER']).withMessage('Invalid event type'),
    body('is_holiday').optional().isBoolean().withMessage('Is holiday must be a boolean'),
    body('is_working_day').optional().isBoolean().withMessage('Is working day must be a boolean'),
    body('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
  ],
  getByMonth: [
    param('year').isInt({ min: 2000, max: 2100 }).withMessage('Year must be a valid year'),
    param('month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
    query('branchId').optional().isInt().withMessage('Branch ID must be an integer'),
    query('academicYearId').optional().isInt().withMessage('Academic year ID must be an integer'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Page size must be between 1 and 100'),
  ],
  findById: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  softDelete: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  findAll: [
    query('search').optional().isString().withMessage('Search must be a string'),
    query('year').optional().isInt().withMessage('Year must be an integer'),
    query('month').optional().isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
    query('branchId').optional().isInt().withMessage('Branch ID must be an integer'),
    query('academicYearId').optional().isInt().withMessage('Academic year ID must be an integer'),
    query('eventType').optional().isIn(['HOLIDAY', 'EXAM', 'EVENT', 'MEETING', 'DEADLINE', 'OTHER']).withMessage('Invalid event type'),
    query('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Page size must be between 1 and 100'),
  ],
};

module.exports = calendarValidators;