// FILE: backend/src/routes/gpa.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/gpa.controller');
const validators = require('../validators/gpa.validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/', authorize('gpa.view'), controller.findAll);
router.get('/cumulative/:studentId', authorize('gpa.view'), controller.getCumulative);
router.get('/:id', authorize('gpa.view'), controller.findById);
router.post('/', authorize('gpa.create'), validators.create, validate, controller.create);
router.post('/recalculate/:studentId', authorize('gpa.edit'), validators.recalculate, validate, controller.recalculate);
router.put('/:id', authorize('gpa.edit'), validators.update, validate, controller.update);
router.delete('/:id', authorize('gpa.delete'), validators.softDelete, validate, controller.softDelete);

module.exports = router;