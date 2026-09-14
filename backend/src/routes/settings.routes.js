// FILE: backend/src/routes/settings.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/settings.controller');
const validators = require('../validators/settings.validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/', authorize('settings.view'), controller.get);
router.put('/', authorize('settings.edit'), validators.update, validate, controller.update);

module.exports = router;