// FILE: backend/src/repositories/guardians.repository.js
const GuardiansModel = require('../models/guardians.model');

const GuardiansRepository = {
  findAll: (filters) => GuardiansModel.findAll(filters),
  count: (filters) => GuardiansModel.count(filters),
  findById: (id) => GuardiansModel.findById(id),
  findByIdWithStudent: (id) => GuardiansModel.findByIdWithStudent(id),
  findByIdWithBranch: (id) => GuardiansModel.findByIdWithBranch(id),
  findByStudent: (studentId) => GuardiansModel.findByStudent(studentId),
  create: (data) => GuardiansModel.create(data),
  update: (id, data) => GuardiansModel.update(id, data),
  softDelete: (id, userId) => GuardiansModel.softDelete(id, userId),
  deleteByStudent: (studentId) => GuardiansModel.deleteByStudent(studentId),
};

module.exports = GuardiansRepository;