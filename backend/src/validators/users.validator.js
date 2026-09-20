'use strict';

const { body, validationResult } = require('express-validator');
const passwordPolicy = require('../utils/passwordPolicy');

/**
 * Acepta las dos formas de nombre que circulan por el sistema y las unifica
 * en `full_name`, que es la columna NOT NULL de `users`.
 *
 * BUG REAL CORREGIDO: la tabla `users` guarda un unico `full_name`, pero la
 * API recibe indistintamente `firstName`/`lastName` (integraciones y otros
 * clientes) o `full_name` (el formulario de la UI). Sin esta normalizacion,
 * un alta enviada con firstName/lastName llegaba al INSERT sin `full_name` y
 * MySQL abortaba con un 500 ("Field 'full_name' doesn't have a default
 * value") en vez de crear el usuario o devolver un 400 explicativo.
 * Se ejecuta ANTES de las reglas de express-validator.
 */
const normalizeFullName = (req, res, next) => {
  const b = req.body || {};
  if (b.full_name == null || String(b.full_name).trim() === '') {
    if (b.fullName) {
      b.full_name = String(b.fullName).trim();
    } else {
      const first = b.firstName ?? b.first_name ?? '';
      const last = b.lastName ?? b.last_name ?? '';
      const joined = `${first} ${last}`.trim();
      if (joined) b.full_name = joined.slice(0, 100);
    }
  }
  next();
};

const create = [
  normalizeFullName,
  body('full_name')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Full name is required (send full_name, or firstName + lastName)')
    .isLength({ max: 100 })
    .withMessage('Full name is too long'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address')
    .custom((value) => {
      if (!value || value.length > 254) {
        throw new Error('Email is too long');
      }
      return true;
    }),
  body('password')
    .isString()
    .trim()
    .withMessage('Password must be a string')
    .custom((value, { req }) => {
      const result = passwordPolicy.validate(value);
      if (!result.valid) {
        throw new Error(result.errors.join('; '));
      }
      return true;
    }),
  body('firstName')
    .optional({ values: 'null' })
    .isString()
    .trim()
    .withMessage('First name must be a string'),
  body('lastName')
    .optional({ values: 'null' })
    .isString()
    .trim()
    .withMessage('Last name must be a string'),
  body('role')
    .optional({ values: 'null' })
    .isIn(['student', 'teacher', 'guardian', 'admin', 'staff'])
    .withMessage('Invalid role'),
];

const update = [
  normalizeFullName,
  body('full_name')
    .optional({ values: 'null' })
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Full name must be a non-empty string')
    .isLength({ max: 100 })
    .withMessage('Full name is too long'),
  body('email')
    .optional({ values: 'null' })
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),
  body('firstName')
    .optional({ values: 'null' })
    .isString()
    .trim()
    .withMessage('First name must be a string'),
  body('lastName')
    .optional({ values: 'null' })
    .isString()
    .trim()
    .withMessage('Last name must be a string'),
  body('status')
    .optional({ values: 'null' })
    .isIn(['active', 'inactive', 'pending', 'suspended'])
    .withMessage('Invalid status'),
];

const softDelete = [
  body('status')
    .optional({ values: 'null' })
    .isIn(['inactive', 'deleted'])
    .withMessage('Invalid status for soft delete'),
];

// HUECO REAL CERRADO: el cambio de contrasena por parte de un ADMIN sobre
// OTRA cuenta es un RESTABLECIMIENTO, no un autoservicio, y no puede exigir
// conocer la contrasena actual de esa persona (que es justamente lo que se
// ha olvidado). Hasta ahora la unica via era el formulario de la UI, que no
// tiene campo de contrasena actual, asi que la accion "Cambiar contrasena"
// fallaba siempre. Se mantiene la exigencia de la contrasena actual solo
// cuando es el propio usuario quien cambia la suya.
const changePassword = [
  body('currentPassword')
    .optional({ values: 'null' })
    .isString()
    .withMessage('Current password must be a string'),
  body('newPassword')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('New password is required')
    .custom((value) => {
      const result = passwordPolicy.validate(value);
      if (!result.valid) {
        throw new Error(result.errors.join('; '));
      }
      return true;
    }),
];

const assignRoles = [
  body('roleIds')
    .optional({ values: 'null' })
    .isArray()
    .withMessage('roleIds must be an array')
    .custom((value) => {
      if (!Array.isArray(value)) {
        throw new Error('roleIds must be an array');
      }
      if (!value.every((id) => typeof id === 'string' || typeof id === 'number')) {
        throw new Error('roleIds must contain valid identifiers');
      }
      return true;
    }),
];

// HUECO REAL CERRADO: `PUT /users/profile` y `POST /users/change-password`
// son rutas de autoservicio que no pasaban por ningun validador. El
// servicio acota los campos con una whitelist, pero un cambio de contrasena
// propio no comprobaba la politica de contrasenas (longitud, mayuscula,
// digito, simbolo) que si exige el resto del sistema, y un email con formato
// invalido llegaba hasta el UPDATE (500 de MySQL en vez de 400).
const profileUpdate = [
  body('email').optional({ values: 'null' }).isEmail().withMessage('Invalid email address').isLength({ max: 254 }).withMessage('Email is too long'),
  body('full_name').optional({ values: 'null' }).isString().trim().notEmpty().withMessage('Full name must be a non-empty string').isLength({ max: 100 }).withMessage('Full name is too long'),
  body('phone').optional({ values: 'null' }).isString().withMessage('Phone must be a string').isLength({ max: 20 }).withMessage('Phone is too long'),
];

const changeOwnPassword = [
  body('currentPassword').isString().notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isString()
    .notEmpty()
    .withMessage('New password is required')
    .custom((value) => {
      const result = passwordPolicy.validate(value);
      if (!result.valid) {
        throw new Error(result.errors.join('; '));
      }
      return true;
    }),
];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        status: 400,
        details: errors.array(),
      },
    });
  }
  return next();
};

module.exports = {
  create,
  update,
  softDelete,
  changePassword,
  assignRoles,
  profileUpdate,
  changeOwnPassword,
  normalizeFullName,
  validate,
};
