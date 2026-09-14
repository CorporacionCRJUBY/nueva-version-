// FILE: backend/src/validators/medicalRecords.validator.js
const { body, param, query } = require('express-validator');

const medicalRecordsValidators = {
  create: [
    body('student_id').isInt().withMessage('Student ID must be an integer'),
    body('medical_condition').optional().isString().withMessage('Medical condition must be a string'),
    body('allergies').optional().isString().withMessage('Allergies must be a string'),
    body('medications').optional().isString().withMessage('Medications must be a string'),
    body('emergency_contact_name').optional().isString().withMessage('Emergency contact name must be a string'),
    body('emergency_contact_phone').optional().isString().withMessage('Emergency contact phone must be a string'),
    body('health_insurance').optional().isString().withMessage('Health insurance must be a string'),
    body('insurance_number').optional().isString().withMessage('Insurance number must be a string'),
    body('notes').optional().isString().withMessage('Notes must be a string'),
    body('last_checkup_date').optional().isISO8601().withMessage('Last checkup date must be a valid date'),
  ],
  update: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('medical_condition').optional().isString().withMessage('Medical condition must be a string'),
    body('allergies').optional().isString().withMessage('Allergies must be a string'),
    body('medications').optional().isString().withMessage('Medications must be a string'),
    body('emergency_contact_name').optional().isString().withMessage('Emergency contact name must be a string'),
    body('emergency_contact_phone').optional().isString().withMessage('Emergency contact phone must be a string'),
    body('health_insurance').optional().isString().withMessage('Health insurance must be a string'),
    body('insurance_number').optional().isString().withMessage('Insurance number must be a string'),
    body('notes').optional().isString().withMessage('Notes must be a string'),
    body('last_checkup_date').optional().isISO8601().withMessage('Last checkup date must be a valid date'),
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
    query('medicalCondition').optional().isString().withMessage('Medical condition must be a string'),
    query('hasAllergy').optional().isBoolean().withMessage('Has allergy must be a boolean'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Page size must be between 1 and 100'),
  ],
};

module.exports = medicalRecordsValidators;