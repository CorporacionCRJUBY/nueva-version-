// FILE: backend/src/routes/credits.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/credits.controller');
const validators = require('../validators/credits.validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/', authorize('credits.view'), controller.findAll);
router.get('/:id', authorize('credits.view'), controller.findById);
router.post('/', authorize('credits.create'), validators.create, validate, controller.create);
router.post('/recalculate/:studentId', authorize('credits.edit'), validators.recalculate, validate, controller.recalculate);
router.put('/:id', authorize('credits.edit'), validators.update, validate, controller.update);
router.delete('/:id', authorize('credits.delete'), validators.softDelete, validate, controller.softDelete);

module.exports = router;