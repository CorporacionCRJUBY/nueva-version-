// FILE: backend/src/routes/permissions.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/permissions.controller');
const validators = require('../validators/permissions.validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/', authorize('permissions.view'), controller.findAll);
router.get('/:id', authorize('permissions.view'), controller.findById);
router.post('/', authorize('permissions.create'), validators.create, validate, controller.create);
router.put('/:id', authorize('permissions.edit'), validators.update, validate, controller.update);
router.delete('/:id', authorize('permissions.delete'), validators.softDelete, validate, controller.softDelete);

module.exports = router;