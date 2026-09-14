// FILE: backend/src/validators/documents.validator.js
const { body, param, query } = require('express-validator');

const documentsValidators = {
  create: [
    body('student_id').isInt().withMessage('Student ID must be an integer'),
    body('document_type').isIn(['IDENTIFICATION', 'TRANSCRIPT', 'CERTIFICATE', 'MEDICAL', 'CONSENT', 'OTHER']).withMessage('Invalid document type'),
    body('title').isString().notEmpty().withMessage('Title is required'),
    // file_path/file_name are NOT NULL in the schema — this endpoint is for
    // registering a document whose file already exists elsewhere (e.g. a
    // migration script); the normal user-facing flow is POST /documents/upload.
    body('file_path').isString().notEmpty().withMessage('File path is required'),
    body('file_name').isString().notEmpty().withMessage('File name is required'),
    body('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
  ],
  upload: [
    body('student_id').isInt().withMessage('Student ID must be an integer'),
    body('document_type').isIn(['IDENTIFICATION', 'TRANSCRIPT', 'CERTIFICATE', 'MEDICAL', 'CONSENT', 'OTHER']).withMessage('Invalid document type'),
    body('title').isString().notEmpty().withMessage('Title is required'),
  ],
  update: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('document_type').optional().isIn(['IDENTIFICATION', 'TRANSCRIPT', 'CERTIFICATE', 'MEDICAL', 'CONSENT', 'OTHER']).withMessage('Invalid document type'),
    body('title').optional().isString().notEmpty().withMessage('Title must be a non-empty string'),
    body('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
  ],
  download: [
    param('id').isInt().withMessage('ID must be an integer'),
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
    query('documentType').optional().isIn(['IDENTIFICATION', 'TRANSCRIPT', 'CERTIFICATE', 'MEDICAL', 'CONSENT', 'OTHER']).withMessage('Invalid document type'),
    query('status').optional().isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Page size must be between 1 and 100'),
  ],
};

module.exports = documentsValidators;