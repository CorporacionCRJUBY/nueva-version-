// FILE: backend/src/routes/subjects.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/subjects.controller');
const validators = require('../validators/subjects.validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/', authorize('subjects.view'), controller.findAll);
router.get('/:id', authorize('subjects.view'), controller.findById);
router.post('/', authorize('subjects.create'), validators.create, validate, controller.create);
router.put('/:id', authorize('subjects.edit'), validators.update, validate, controller.update);
router.delete('/:id', authorize('subjects.delete'), validators.softDelete, validate, controller.softDelete);

module.exports = router;