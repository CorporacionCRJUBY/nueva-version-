// FILE: backend/src/routes/calendar.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/calendar.controller');
const validators = require('../validators/calendar.validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/', authorize('calendar.view'), controller.findAll);
router.get('/:year/:month', authorize('calendar.view'), controller.getByMonth);
router.get('/:id', authorize('calendar.view'), controller.findById);
router.post('/', authorize('calendar.create'), validators.create, validate, controller.create);
router.put('/:id', authorize('calendar.edit'), validators.update, validate, controller.update);
router.delete('/:id', authorize('calendar.delete'), validators.softDelete, validate, controller.softDelete);

module.exports = router;