// FILE: backend/src/routes/assignments.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/assignments.controller');
const validators = require('../validators/assignments.validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/', authorize('assignments.view'), validators.findAll, validate, controller.findAll);
router.get('/teacher/:teacherId', authorize('assignments.view'), controller.getByTeacher);
// FIX (2026-09-16, autoasignación de materias): debe ir ANTES de '/:id' —
// si no, Express interpreta "groups" como un :id y cae en findById.
router.get('/groups', authorize('assignments.view'), validators.findGroups, validate, controller.getGroups);
router.get('/section/:section', authorize('assignments.view'), controller.getBySection);
router.get('/:id', authorize('assignments.view'), controller.findById);
router.post('/', authorize('assignments.create'), validators.create, validate, controller.create);
router.put('/:id', authorize('assignments.edit'), validators.update, validate, controller.update);
router.delete('/:id', authorize('assignments.delete'), validators.softDelete, validate, controller.softDelete);

module.exports = router;