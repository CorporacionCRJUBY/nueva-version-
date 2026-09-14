// FILE: backend/src/routes/reports.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/reports.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/', authorize('reports.view'), controller.findAll);
router.get('/:id', authorize('reports.view'), controller.findById);
router.get('/:id/preview', authorize('reports.view'), controller.preview);

module.exports = router;