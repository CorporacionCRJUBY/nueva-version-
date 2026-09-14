// FILE: backend/src/routes/academicPeriods.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/academicPeriods.controller');
const validators = require('../validators/academicPeriods.validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/', authorize('academic-periods.view'), controller.findAll);
router.get('/:id', authorize('academic-periods.view'), controller.findById);
router.post('/', authorize('academic-periods.create'), validators.create, validate, controller.create);
router.put('/:id', authorize('academic-periods.edit'), validators.update, validate, controller.update);
router.delete('/:id', authorize('academic-periods.delete'), validators.softDelete, validate, controller.softDelete);
router.post('/:id/close', authorize('academic-periods.edit'), validators.close, validate, controller.close);
router.post('/:id/lock', authorize('academic-periods.edit'), validators.lock, validate, controller.lock);

module.exports = router;