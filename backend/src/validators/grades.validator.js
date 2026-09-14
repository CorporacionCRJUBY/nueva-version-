// FILE: backend/src/validators/grades.validator.js
const { body, param, query } = require('express-validator');

const gradesValidators = {
  create: [
    body('student_id').isInt().withMessage('Student ID must be an integer'),
    body('subject_id').isInt().withMessage('Subject ID must be an integer'),
    body('assignment_id').isInt().withMessage('Assignment ID must be an integer'),
    body('academic_period_id').isInt().withMessage('Academic period ID must be an integer'),
    body('grade_value').isFloat({ min: 0, max: 100 }).withMessage('Grade value must be between 0 and 100'),
    body('grade_letter').optional().isString().withMessage('Grade letter must be a string'),
    body('weight').optional().isFloat({ min: 0, max: 1 }).withMessage('Weight must be between 0 and 1'),
    body('status').optional().isIn(['DRAFT', 'PUBLISHED', 'LOCKED', 'UNLOCKED']).withMessage('Invalid status'),
  ],
  update: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('grade_value').optional().isFloat({ min: 0, max: 100 }).withMessage('Grade value must be between 0 and 100'),
    body('grade_letter').optional().isString().withMessage('Grade letter must be a string'),
    body('weight').optional().isFloat({ min: 0, max: 1 }).withMessage('Weight must be between 0 and 1'),
    body('status').optional().isIn(['DRAFT', 'PUBLISHED', 'LOCKED', 'UNLOCKED']).withMessage('Invalid status'),
  ],
  findById: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  // FIX (bajo B5): este endpoint no tenía ninguna validación de entrada.
  requestChange: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('requested_grade').isFloat({ min: 0, max: 100 }).withMessage('Requested grade must be between 0 and 100'),
    body('reason').isString().trim().isLength({ min: 1, max: 1000 }).withMessage('Reason is required (max 1000 chars)'),
  ],
  softDelete: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  findAll: [
    query('studentId').optional().isInt().withMessage('Student ID must be an integer'),
    query('subjectId').optional().isInt().withMessage('Subject ID must be an integer'),
    query('assignmentId').optional().isInt().withMessage('Assignment ID must be an integer'),
    query('academicPeriodId').optional().isInt().withMessage('Academic period ID must be an integer'),
    query('status').optional().isIn(['DRAFT', 'PUBLISHED', 'LOCKED', 'UNLOCKED']).withMessage('Invalid status'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Page size must be between 1 and 100'),
  ],
};

module.exports = gradesValidators;