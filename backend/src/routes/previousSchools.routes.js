// FILE: backend/src/routes/previousSchools.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/previousSchools.controller');
const validators = require('../validators/previousSchools.validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/', authorize('previous-schools.view'), controller.findAll);
router.get('/student/:studentId', authorize('previous-schools.view'), controller.getByStudent);
router.get('/:id', authorize('previous-schools.view'), controller.findById);
router.post('/', authorize('previous-schools.create'), validators.create, validate, controller.create);
router.put('/:id', authorize('previous-schools.edit'), validators.update, validate, controller.update);
router.delete('/:id', authorize('previous-schools.delete'), validators.softDelete, validate, controller.softDelete);

module.exports = router;