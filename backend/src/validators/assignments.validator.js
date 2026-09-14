// FILE: backend/src/validators/assignments.validator.js
const { body, param, query } = require('express-validator');

const assignmentsValidators = {
  create: [
    body('teacher_id').isInt().withMessage('Teacher ID must be an integer'),
    body('subject_id').isInt().withMessage('Subject ID must be an integer'),
    body('grade').isString().notEmpty().withMessage('Grade must be a non-empty string'),
    body('section').optional().isString().withMessage('Section must be a string'),
    body('branch_id').isInt().withMessage('Branch ID must be an integer'),
    body('academic_year_id').isInt().withMessage('Academic year ID must be an integer'),
    body('schedule').optional().isString().withMessage('Schedule must be a string'),
    body('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
  ],
  update: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('teacher_id').optional().isInt().withMessage('Teacher ID must be an integer'),
    body('subject_id').optional().isInt().withMessage('Subject ID must be an integer'),
    body('grade').optional().isString().withMessage('Grade must be a string'),
    body('section').optional().isString().withMessage('Section must be a string'),
    body('branch_id').optional().isInt().withMessage('Branch ID must be an integer'),
    body('academic_year_id').optional().isInt().withMessage('Academic year ID must be an integer'),
    body('schedule').optional().isString().withMessage('Schedule must be a string'),
    body('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
  ],
  getByTeacher: [
    param('teacherId').isInt().withMessage('Teacher ID must be an integer'),
    query('academicYearId').optional().isInt().withMessage('Academic year ID must be an integer'),
  ],
  getBySection: [
    param('section').isString().withMessage('Section must be a string'),
    query('academicYearId').optional().isInt().withMessage('Academic year ID must be an integer'),
  ],
  findById: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  softDelete: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  findAll: [
    query('teacherId').optional().isInt().withMessage('Teacher ID must be an integer'),
    query('subjectId').optional().isInt().withMessage('Subject ID must be an integer'),
    query('grade').optional().isString().withMessage('Grade must be a string'),
    query('section').optional().isString().withMessage('Section must be a string'),
    query('branchId').optional().isInt().withMessage('Branch ID must be an integer'),
    query('academicYearId').optional().isInt().withMessage('Academic year ID must be an integer'),
    query('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Page size must be between 1 and 100'),
  ],
};

module.exports = assignmentsValidators;