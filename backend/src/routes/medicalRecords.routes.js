// FILE: backend/src/routes/medicalRecords.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/medicalRecords.controller');
const validators = require('../validators/medicalRecords.validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/', authorize('medical-records.view'), controller.findAll);
router.get('/:id', authorize('medical-records.view'), controller.findById);
router.post('/', authorize('medical-records.create'), validators.create, validate, controller.create);
router.put('/:id', authorize('medical-records.edit'), validators.update, validate, controller.update);
router.delete('/:id', authorize('medical-records.delete'), validators.softDelete, validate, controller.softDelete);

module.exports = router;