// FILE: backend/src/routes/attendance.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/attendance.controller');
const validators = require('../validators/attendance.validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/', authorize('attendance.view'), controller.findAll);
router.get('/monthly/:assignmentId/:year/:month', authorize('attendance.view'), controller.getMonthlyGrid);
router.get('/student/:studentId/:year/:month', authorize('attendance.view'), controller.getStudentMonthlyReport);
router.get('/:id', authorize('attendance.view'), controller.findById);

router.post('/', authorize('attendance.create'), validators.create, validate, controller.create);
router.post('/daily', authorize('attendance.create'), validators.saveDaily, validate, controller.saveDaily);
router.put('/:id', authorize('attendance.edit'), validators.update, validate, controller.update);
router.delete('/:id', authorize('attendance.delete'), validators.softDelete, validate, controller.softDelete);

module.exports = router;
