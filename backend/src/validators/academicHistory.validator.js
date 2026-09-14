'use strict';

const { body, param, query, validationResult } = require('express-validator');

const validateGet = [
  query('studentId').optional().isString().withMessage('studentId must be a string'),
  query('academicYearId').optional().isString().withMessage('academicYearId must be a string'),
  query('academicPeriodId').optional().isString().withMessage('academicPeriodId must be a string'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          status: 400,
          details: errors.array(),
        },
      });
    }
    return next();
  },
];

// BUG REAL CORREGIDO: `validateCreate` validaba `query(...)` en vez del
// cuerpo. El POST recibe los datos en `req.body`, asi que estas reglas
// miraban el lugar equivocado: nunca validaban nada de lo que realmente se
// insertaba (todos los campos eran `optional` sobre un query vacio) y el
// payload llegaba limpio al servicio.
const validateCreate = [
  body('student_id').isInt().withMessage('student_id must be an integer'),
  body('academic_year_id').optional().isInt().withMessage('academic_year_id must be an integer'),
  body('academic_period_id').optional().isInt().withMessage('academic_period_id must be an integer'),
  body('subject_id').optional().isInt().withMessage('subject_id must be an integer'),
  body('grade_value').optional().isFloat().withMessage('grade_value must be a number'),
  body('grade_letter').optional().isString().withMessage('grade_letter must be a string'),
  body('status').optional().isString().withMessage('status must be a string'),
  body('notes').optional().isString().withMessage('notes must be a string'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          status: 400,
          details: errors.array(),
        },
      });
    }
    return next();
  },
];

// HUECO REAL CERRADO: `PUT /academic-history/:id` era la unica ruta de
// escritura del modulo sin validador. El servicio ya filtraba por
// whitelist, pero un `grade_value` no numerico o un tipo incorrecto en
// cualquier campo llegaba hasta el UPDATE y MySQL respondia con un 500 en
// lugar de un 400 de validacion.
const validateUpdate = [
  param('id').isInt().withMessage('ID must be an integer'),
  body('student_id').optional().isInt().withMessage('student_id must be an integer'),
  body('academic_year_id').optional().isInt().withMessage('academic_year_id must be an integer'),
  body('academic_period_id').optional().isInt().withMessage('academic_period_id must be an integer'),
  body('subject_id').optional().isInt().withMessage('subject_id must be an integer'),
  body('grade_value').optional().isFloat().withMessage('grade_value must be a number'),
  body('grade_letter').optional().isString().withMessage('grade_letter must be a string'),
  body('status').optional().isString().withMessage('status must be a string'),
  body('notes').optional().isString().withMessage('notes must be a string'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          status: 400,
          details: errors.array(),
        },
      });
    }
    return next();
  },
];

module.exports = {
  validateGet,
  validateCreate,
  validateUpdate,
};
