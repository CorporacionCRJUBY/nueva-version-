// FILE: backend/src/routes/roles.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/roles.controller');
const validators = require('../validators/roles.validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/', authorize('roles.view'), controller.findAll);
router.get('/:id', authorize('roles.view'), controller.findById);
router.get('/:id/permissions', authorize('roles.view'), controller.getPermissions);
router.post('/', authorize('roles.create'), validators.create, validate, controller.create);
router.post('/:id/permissions', authorize('roles.edit'), validators.assignPermissions, validate, controller.assignPermissions);
router.put('/:id', authorize('roles.edit'), validators.update, validate, controller.update);
router.delete('/:id', authorize('roles.delete'), validators.softDelete, validate, controller.softDelete);

module.exports = router;