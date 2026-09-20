// FILE: backend/src/repositories/permissions.repository.js
const PermissionsModel = require('../models/permissions.model');

const PermissionsRepository = {
  findAll: (filters) => PermissionsModel.findAll(filters),
  count: (filters) => PermissionsModel.count(filters),
  findById: (id) => PermissionsModel.findById(id),
  findByIds: (ids) => PermissionsModel.findByIds(ids),
  findByModule: (module) => PermissionsModel.findByModule(module),
  findByRole: (roleId) => PermissionsModel.findByRole(roleId),
  create: (data) => PermissionsModel.create(data),
  update: (id, data) => PermissionsModel.update(id, data),
  softDelete: (id, userId) => PermissionsModel.softDelete(id, userId),
};

module.exports = PermissionsRepository;