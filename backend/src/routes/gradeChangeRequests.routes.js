// FILE: backend/src/routes/gradeChangeRequests.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/gradeChangeRequests.controller');
const validators = require('../validators/gradeChangeRequests.validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/', authorize('grade-change-requests.view'), controller.findAll);
router.get('/:id', authorize('grade-change-requests.view'), controller.findById);
router.post('/', authorize('grade-change-requests.create'), validators.create, validate, controller.create);
router.put('/:id', authorize('grade-change-requests.edit'), validators.update, validate, controller.update);
router.delete('/:id', authorize('grade-change-requests.delete'), validators.softDelete, validate, controller.softDelete);
router.post('/:id/approve', authorize('grade-change-requests.approve'), validators.approve, validate, controller.approve);
router.post('/:id/reject', authorize('grade-change-requests.reject'), validators.reject, validate, controller.reject);

module.exports = router;