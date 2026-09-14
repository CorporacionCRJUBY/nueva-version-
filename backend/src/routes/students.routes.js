// FILE: backend/src/routes/students.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/students.controller');
const validators = require('../validators/students.validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const { restrictBranch, injectUserBranch } = require('../middleware/branchAccess.middleware');
const { single } = require('../middleware/upload.middleware');

router.use(authenticate);
router.use(injectUserBranch());

router.get('/', authorize('students.view'), controller.findAll);
router.get('/:id', authorize('students.view'), controller.findById);
router.get('/:id/record', authorize('students.view'), controller.getFullRecord);
router.post('/', authorize('students.create'), validators.create, validate, controller.create);
router.put('/:id', authorize('students.edit'), restrictBranch, validators.update, validate, controller.update);
router.post('/:id/status', authorize('students.edit'), restrictBranch, validators.updateStatus, validate, controller.updateStatus);
router.post('/:id/photo', authorize('students.edit'), restrictBranch, single('photo'), controller.uploadPhoto);
router.get('/:id/photo', authorize('students.view'), controller.getPhoto);
router.delete('/:id', authorize('students.delete'), restrictBranch, validators.softDelete, validate, controller.softDelete);

module.exports = router;