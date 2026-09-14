// FILE: backend/src/repositories/roles.repository.js
const RolesModel = require('../models/roles.model');

const RolesRepository = {
  findAll: (filters) => RolesModel.findAll(filters),
  count: (filters) => RolesModel.count(filters),
  findById: (id) => RolesModel.findById(id),
  findByName: (name) => RolesModel.findByName(name),
  create: (data) => RolesModel.create(data),
  update: (id, data) => RolesModel.update(id, data),
  softDelete: (id, userId) => RolesModel.softDelete(id, userId),
  assignPermissions: (roleId, permissionIds) => RolesModel.assignPermissions(roleId, permissionIds),
  clearPermissions: (roleId) => RolesModel.clearPermissions(roleId),
  getPermissions: (roleId) => RolesModel.getPermissions(roleId),
};

module.exports = RolesRepository;