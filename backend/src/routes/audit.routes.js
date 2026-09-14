// FILE: backend/src/routes/audit.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/audit.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/', authorize('audit.view'), controller.findAll);
router.get('/record/:code', authorize('audit.view'), controller.getByRecord);
router.get('/:id', authorize('audit.view'), controller.findById);

module.exports = router;