// FILE: backend/src/routes/grades.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/grades.controller');
const validators = require('../validators/grades.validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/', authorize('grades.view'), controller.findAll);
router.get('/:id', authorize('grades.view'), controller.findById);
router.post('/', authorize('grades.create'), validators.create, validate, controller.create);
router.post('/:id/request-change', authorize('grades.request_change'), validators.requestChange, validate, controller.requestChange);
router.put('/:id', authorize('grades.edit'), validators.update, validate, controller.update);
router.delete('/:id', authorize('grades.delete'), validators.softDelete, validate, controller.softDelete);

module.exports = router;
