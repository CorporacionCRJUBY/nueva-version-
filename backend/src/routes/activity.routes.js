// FILE: backend/src/routes/activity.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/activity.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/', authorize('activity.view'), controller.findAll);
router.get('/user/:userId', authorize('activity.view'), controller.getByUser);
router.get('/:id', authorize('activity.view'), controller.findById);

module.exports = router;