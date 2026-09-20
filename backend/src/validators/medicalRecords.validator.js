// FILE: backend/src/validators/medicalRecords.validator.js
const { body, param, query } = require('express-validator');

const medicalRecordsValidators = {
  create: [
    body('student_id').isInt().withMessage('Student ID must be an integer'),
    body('medical_condition').optional({ values: 'null' }).isString().withMessage('Medical condition must be a string'),
    body('allergies').optional({ values: 'null' }).isString().withMessage('Allergies must be a string'),
    body('medications').optional({ values: 'null' }).isString().withMessage('Medications must be a string'),
    body('emergency_contact_name').optional({ values: 'null' }).isString().withMessage('Emergency contact name must be a string'),
    body('emergency_contact_phone').optional({ values: 'null' }).isString().withMessage('Emergency contact phone must be a string'),
    body('health_insurance').optional({ values: 'null' }).isString().withMessage('Health insurance must be a string'),
    body('insurance_number').optional({ values: 'null' }).isString().withMessage('Insurance number must be a string'),
    body('notes').optional({ values: 'null' }).isString().withMessage('Notes must be a string'),
    body('last_checkup_date').optional({ values: 'null' }).isISO8601().withMessage('Last checkup date must be a valid date'),
  ],
  update: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('medical_condition').optional({ values: 'null' }).isString().withMessage('Medical condition must be a string'),
    body('allergies').optional({ values: 'null' }).isString().withMessage('Allergies must be a string'),
    body('medications').optional({ values: 'null' }).isString().withMessage('Medications must be a string'),
    body('emergency_contact_name').optional({ values: 'null' }).isString().withMessage('Emergency contact name must be a string'),
    body('emergency_contact_phone').optional({ values: 'null' }).isString().withMessage('Emergency contact phone must be a string'),
    body('health_insurance').optional({ values: 'null' }).isString().withMessage('Health insurance must be a string'),
    body('insurance_number').optional({ values: 'null' }).isString().withMessage('Insurance number must be a string'),
    body('notes').optional({ values: 'null' }).isString().withMessage('Notes must be a string'),
    body('last_checkup_date').optional({ values: 'null' }).isISO8601().withMessage('Last checkup date must be a valid date'),
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
    query('medicalCondition').optional({ values: 'null' }).isString().withMessage('Medical condition must be a string'),
    query('hasAllergy').optional({ values: 'null' }).isBoolean().withMessage('Has allergy must be a boolean'),
    query('page').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional({ values: 'null' }).isInt({ min: 1, max: 1000 }).withMessage('Page size must be between 1 and 1000'),
  ],
};

module.exports = medicalRecordsValidators;