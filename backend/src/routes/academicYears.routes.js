// FILE: backend/src/routes/academicYears.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/academicYears.controller');
const validators = require('../validators/academicYears.validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/', authorize('academic-years.view'), controller.findAll);
router.get('/:id', authorize('academic-years.view'), controller.findById);
router.post('/', authorize('academic-years.create'), validators.create, validate, controller.create);
// Marca el ano como vigente. La UI ya ofrecia la accion pero la ruta no
// existia en el backend (respondia 404).
router.post('/:id/activate', authorize('academic-years.edit'), validate, controller.activate);
router.put('/:id', authorize('academic-years.edit'), validators.update, validate, controller.update);
router.delete('/:id', authorize('academic-years.delete'), validators.softDelete, validate, controller.softDelete);

module.exports = router;