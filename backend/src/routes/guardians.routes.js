// FILE: backend/src/routes/guardians.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/guardians.controller');
const validators = require('../validators/guardians.validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/', authorize('guardians.view'), controller.findAll);
router.get('/student/:studentId', authorize('guardians.view'), controller.getByStudent);
router.get('/:id', authorize('guardians.view'), controller.findById);
router.post('/', authorize('guardians.create'), validators.create, validate, controller.create);
router.put('/:id', authorize('guardians.edit'), validators.update, validate, controller.update);
router.delete('/:id', authorize('guardians.delete'), validators.softDelete, validate, controller.softDelete);

module.exports = router;