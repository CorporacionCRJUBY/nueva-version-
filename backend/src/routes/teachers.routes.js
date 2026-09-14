// FILE: backend/src/routes/teachers.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/teachers.controller');
const validators = require('../validators/teachers.validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const { restrictBranch, injectUserBranch } = require('../middleware/branchAccess.middleware');

router.use(authenticate);
router.use(injectUserBranch());

router.get('/', authorize('teachers.view'), controller.findAll);
router.get('/:id', authorize('teachers.view'), controller.findById);
router.get('/:id/assignments', authorize('teachers.view'), controller.getAssignments);
router.post('/', authorize('teachers.create'), validators.create, validate, controller.create);
router.put('/:id', authorize('teachers.edit'), restrictBranch, validators.update, validate, controller.update);
router.delete('/:id', authorize('teachers.delete'), restrictBranch, validators.softDelete, validate, controller.softDelete);

module.exports = router;