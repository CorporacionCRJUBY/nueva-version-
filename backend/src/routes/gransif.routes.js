// FILE: backend/src/routes/gransif.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/gransif.controller');
const validators = require('../validators/gransif.validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/', authorize('gransif.view'), controller.findAll);
router.get('/:id', authorize('gransif.view'), controller.findById);
router.post('/', authorize('gransif.create'), validators.create, validate, controller.create);
router.post('/:id/activate', authorize('gransif.edit'), validators.activate, validate, controller.activate);
router.put('/:id', authorize('gransif.edit'), validators.update, validate, controller.update);
router.delete('/:id', authorize('gransif.delete'), validators.softDelete, validate, controller.softDelete);

module.exports = router;