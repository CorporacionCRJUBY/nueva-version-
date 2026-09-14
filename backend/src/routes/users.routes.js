// FILE: backend/src/routes/users.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/users.controller');
const validators = require('../validators/users.validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const { restrictBranch, injectUserBranch } = require('../middleware/branchAccess.middleware');

router.use(authenticate);
router.use(injectUserBranch());

// Autoservicio: /profile y /change-password DEBEN ir antes de /:id para no
// capturarse como id. No exigen permiso (solo sesión) porque son acciones
// sobre la cuenta propia, restringidas a ella en el servicio.
router.put('/profile', validators.profileUpdate, validators.validate, controller.updateProfile);
router.post('/change-password', validators.changeOwnPassword, validators.validate, controller.changeOwnPassword);

router.get('/', authorize('users.view'), controller.findAll);
router.get('/:id', authorize('users.view'), controller.findById);
router.post('/', authorize('users.create'), validators.create, validate, controller.create);
router.put('/:id', authorize('users.edit'), restrictBranch, validators.update, validate, controller.update);
router.delete('/:id', authorize('users.delete'), restrictBranch, validators.softDelete, validate, controller.softDelete);
router.post('/:id/change-password', authorize('users.edit'), validators.changePassword, validate, controller.changePassword);
router.get('/:id/roles', authorize('users.view'), controller.getRoles);
router.post('/:id/roles', authorize('users.edit'), validators.assignRoles, validate, controller.assignRoles);

module.exports = router;