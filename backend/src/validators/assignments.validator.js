// FILE: backend/src/validators/assignments.validator.js
const { body, param, query } = require('express-validator');

const assignmentsValidators = {
  create: [
    // FIX (2026-09-16, autoasignación de materias): teacher_id deja de ser
    // obligatorio en el body — cuando quien crea es un docente, el servicio
    // lo resuelve solo a partir de su propio usuario (ver assignments.
    // service.js) y cualquier teacher_id que mande se ignora. Sigue siendo
    // obligatorio para un ADMIN/SUPER_ADMIN capturando la asignación a mano;
    // esa regla se valida en el servicio, no aquí, porque el validador no
    // conoce el rol de quien llama.
    body('teacher_id').optional({ values: 'null' }).isInt().withMessage('Teacher ID must be an integer'),
    body('subject_id').isInt().withMessage('Subject ID must be an integer'),
    body('grade').isString().notEmpty().withMessage('Grade must be a non-empty string'),
    body('section').optional({ values: 'null' }).isString().withMessage('Section must be a string'),
    body('branch_id').isInt().withMessage('Branch ID must be an integer'),
    body('academic_year_id').isInt().withMessage('Academic year ID must be an integer'),
    body('schedule').optional({ values: 'null' }).isString().withMessage('Schedule must be a string'),
    body('status').optional({ values: 'null' }).isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
  ],
  update: [
    param('id').isInt().withMessage('ID must be an integer'),
    body('teacher_id').optional({ values: 'null' }).isInt().withMessage('Teacher ID must be an integer'),
    body('subject_id').optional({ values: 'null' }).isInt().withMessage('Subject ID must be an integer'),
    body('grade').optional({ values: 'null' }).isString().withMessage('Grade must be a string'),
    body('section').optional({ values: 'null' }).isString().withMessage('Section must be a string'),
    body('branch_id').optional({ values: 'null' }).isInt().withMessage('Branch ID must be an integer'),
    body('academic_year_id').optional({ values: 'null' }).isInt().withMessage('Academic year ID must be an integer'),
    body('schedule').optional({ values: 'null' }).isString().withMessage('Schedule must be a string'),
    body('status').optional({ values: 'null' }).isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
  ],
  getByTeacher: [
    param('teacherId').isInt().withMessage('Teacher ID must be an integer'),
    query('academicYearId').optional({ values: 'null' }).isInt().withMessage('Academic year ID must be an integer'),
  ],
  getBySection: [
    param('section').isString().withMessage('Section must be a string'),
    query('academicYearId').optional({ values: 'null' }).isInt().withMessage('Academic year ID must be an integer'),
  ],
  findById: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  softDelete: [
    param('id').isInt().withMessage('ID must be an integer'),
  ],
  findGroups: [
    query('branchId').optional({ values: 'null' }).isInt().withMessage('Branch ID must be an integer'),
    query('academicYearId').optional({ values: 'null' }).isInt().withMessage('Academic year ID must be an integer'),
  ],
  findAll: [
    query('teacherId').optional({ values: 'null' }).isInt().withMessage('Teacher ID must be an integer'),
    query('subjectId').optional({ values: 'null' }).isInt().withMessage('Subject ID must be an integer'),
    query('grade').optional({ values: 'null' }).isString().withMessage('Grade must be a string'),
    query('section').optional({ values: 'null' }).isString().withMessage('Section must be a string'),
    query('branchId').optional({ values: 'null' }).isInt().withMessage('Branch ID must be an integer'),
    query('academicYearId').optional({ values: 'null' }).isInt().withMessage('Academic year ID must be an integer'),
    query('status').optional({ values: 'null' }).isIn(['ACTIVE', 'INACTIVE']).withMessage('Invalid status'),
    query('page').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('pageSize').optional({ values: 'null' }).isInt({ min: 1, max: 1000 }).withMessage('Page size must be between 1 and 1000'),
  ],
};

module.exports = assignmentsValidators;