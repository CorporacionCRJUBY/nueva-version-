// FILE: backend/src/routes/transcripts.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/transcripts.controller');
const validators = require('../validators/transcripts.validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/', authorize('transcripts.view'), controller.findAll);
router.get('/:id', authorize('transcripts.view'), controller.findById);
router.get('/:id/preview', authorize('transcripts.view'), controller.preview);
router.post('/', authorize('transcripts.create'), validators.create, validate, controller.create);
router.post('/:id/generate', authorize('transcripts.generate'), validators.generate, validate, controller.generate);
router.post('/:id/reprint', authorize('transcripts.generate'), validators.reprint, validate, controller.reprint);
router.put('/:id', authorize('transcripts.edit'), validators.update, validate, controller.update);
router.delete('/:id', authorize('transcripts.delete'), validators.softDelete, validate, controller.softDelete);

module.exports = router;