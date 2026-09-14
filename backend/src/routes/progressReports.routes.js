// FILE: backend/src/routes/progressReports.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/progressReports.controller');
const validators = require('../validators/progressReports.validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/', authorize('progress-reports.view'), controller.findAll);
router.get('/:id', authorize('progress-reports.view'), controller.findById);
router.get('/:id/preview', authorize('progress-reports.view'), controller.preview);
router.post('/', authorize('progress-reports.create'), validators.create, validate, controller.create);
router.post('/:id/generate', authorize('progress-reports.generate'), validators.generate, validate, controller.generate);
router.put('/:id', authorize('progress-reports.edit'), validators.update, validate, controller.update);
router.delete('/:id', authorize('progress-reports.delete'), validators.softDelete, validate, controller.softDelete);

module.exports = router;