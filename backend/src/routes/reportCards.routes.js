// FILE: backend/src/routes/reportCards.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/reportCards.controller');
const validators = require('../validators/reportCards.validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/', authorize('report-cards.view'), controller.findAll);
router.get('/:id', authorize('report-cards.view'), controller.findById);
router.get('/:id/preview', authorize('report-cards.view'), controller.preview);
router.post('/', authorize('report-cards.create'), validators.create, validate, controller.create);
router.post('/:id/generate', authorize('report-cards.generate'), validators.generate, validate, controller.generate);
router.put('/:id', authorize('report-cards.edit'), validators.update, validate, controller.update);
router.delete('/:id', authorize('report-cards.delete'), validators.softDelete, validate, controller.softDelete);

module.exports = router;