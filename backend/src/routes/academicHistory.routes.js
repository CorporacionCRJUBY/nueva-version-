'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/academicHistory.controller');
const validator = require('../validators/academicHistory.validator');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

// /student/:studentId DEBE ir antes de /:id para que 'student' no se
// capture como id.
router.get('/student/:studentId', authorize('academic-history.view'), controller.getByStudent);
router.get('/:id', authorize('academic-history.view'), controller.findById);
router.get('/', authorize('academic-history.view'), validator.validateGet, controller.getAcademicHistory);
router.post('/', authorize('academic-history.create'), validator.validateCreate, controller.createAcademicHistory);
router.put(
  '/:id',
  authorize('academic-history.edit'),
  validator.validateUpdate,
  controller.updateAcademicHistory
);
router.delete('/:id', authorize('academic-history.delete'), controller.deleteAcademicHistory);

module.exports = router;