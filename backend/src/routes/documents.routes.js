// FILE: backend/src/routes/documents.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/documents.controller');
const validators = require('../validators/documents.validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const { single } = require('../middleware/upload.middleware');

router.use(authenticate);

router.get('/', authorize('documents.view'), controller.findAll);
router.get('/:id', authorize('documents.view'), controller.findById);
router.post('/', authorize('documents.create'), validators.create, validate, controller.create);
router.post('/upload', authorize('documents.create'), single('file'), validators.upload, validate, controller.upload);
router.get('/:id/download', authorize('documents.view'), controller.download);
router.put('/:id', authorize('documents.edit'), validators.update, validate, controller.update);
router.delete('/:id', authorize('documents.delete'), validators.softDelete, validate, controller.softDelete);

module.exports = router;