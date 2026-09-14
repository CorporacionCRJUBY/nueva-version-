// FILE: backend/src/routes/scholarships.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/scholarships.controller');
const validators = require('../validators/scholarships.validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/', authorize('scholarships.view'), controller.findAll);
router.get('/:id', authorize('scholarships.view'), controller.findById);
router.get('/:id/history', authorize('scholarships.view'), controller.getHistory);
router.post('/', authorize('scholarships.create'), validators.create, validate, controller.create);
router.post('/:id/status', authorize('scholarships.edit'), validators.updateStatus, validate, controller.updateStatus);
router.put('/:id', authorize('scholarships.edit'), validators.update, validate, controller.update);
router.delete('/:id', authorize('scholarships.delete'), validators.softDelete, validate, controller.softDelete);

module.exports = router;