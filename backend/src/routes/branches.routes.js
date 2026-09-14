// FILE: backend/src/routes/branches.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/branches.controller');
const validators = require('../validators/branches.validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/', authorize('branches.view'), controller.findAll);
router.get('/:id', authorize('branches.view'), controller.findById);
router.post('/', authorize('branches.create'), validators.create, validate, controller.create);
router.put('/:id', authorize('branches.edit'), validators.update, validate, controller.update);
router.delete('/:id', authorize('branches.delete'), validators.softDelete, validate, controller.softDelete);

module.exports = router;