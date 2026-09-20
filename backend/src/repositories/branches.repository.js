// FILE: backend/src/repositories/branches.repository.js
const BranchesModel = require('../models/branches.model');

const BranchesRepository = {
  findAll: (filters) => BranchesModel.findAll(filters),
  count: (filters) => BranchesModel.count(filters),
  findById: (id) => BranchesModel.findById(id),
  create: (data) => BranchesModel.create(data),
  update: (id, data) => BranchesModel.update(id, data),
  softDelete: (id, userId) => BranchesModel.softDelete(id, userId),
};

module.exports = BranchesRepository;