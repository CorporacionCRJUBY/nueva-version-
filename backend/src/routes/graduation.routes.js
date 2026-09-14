// FILE: backend/src/routes/graduation.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/graduation.controller');
const validators = require('../validators/graduation.validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/', authorize('graduation.view'), controller.findAll);
router.get('/:id', authorize('graduation.view'), controller.findById);
router.post('/', authorize('graduation.create'), validators.create, validate, controller.create);
router.post('/validate/:studentId', authorize('graduation.validate'), validators.validate, validate, controller.validate);
router.put('/:id', authorize('graduation.edit'), validators.update, validate, controller.update);
router.delete('/:id', authorize('graduation.delete'), validators.softDelete, validate, controller.softDelete);

module.exports = router;