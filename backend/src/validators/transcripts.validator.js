// FILE: backend/src/validators/transcripts.validator.js
const { body, param, query } = require('express-validator');

const transcriptsValidators = {
  create: [
    body('student_id').isInt().withMessage('Student ID must be an integer'),
    body('academic_period_id').isInt().withMessage('Academic period ID must be an integer'),
    body('academic_year_id').isInt().withMessage('Academic year ID must be an integer'),
    body('transcript_type').isIn(['OFFICIAL', 'UNOFFICIAL']).withMessage('Invalid transcript type'),
    body('status').optional().isIn(['DRAFT', 'OFFICIAL', 'ARCHIVED', 'REPRINTED']).withMessage('Invalid status'),
    body('notes').optional().isString().withMessage('Notes must be a string'),
  ],
  update: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('transcript_type').optional().isIn(['OFFICIAL', 'UNOFFICIAL']).withMessage('Invalid transcript type'),
    body('status').optional().isIn(['DRAFT', 'OFFICIAL', 'ARCHIVED', 'REPRINTED']).withMessage('Invalid status'),
    body('notes').optional().isString().withMessage('Notes must be a string'),
  ],
  generate: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  preview: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  reprint: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  findById: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  softDelete: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  findAll: [
    query('studentId').optional().isInt().withMessage('Student ID must be an integer'),
    query('academicPeriodId').optional().isInt().withMessage('Academic period ID must be an integer'),
    query('academicYearId').optional().isInt().withMessage('Academic year ID must be an integer'),
    query('status').optional().isIn(['DRAFT', 'OFFICIAL', 'ARCHIVED', 'REPRINTED']).withMessage('Invalid status'),
    query('transcriptType').optional().isIn(['OFFICIAL', 'UNOFFICIAL']).withMessage('Invalid transcript type'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Page size must be between 1 and 100'),
  ],
};

module.exports = transcriptsValidators;