// FILE: backend/src/repositories/gransif.repository.js
const GransifModel = require('../models/gransif.model');

const GransifRepository = {
  findAll: (filters) => GransifModel.findAll(filters),
  count: (filters) => GransifModel.count(filters),
  findById: (id) => GransifModel.findById(id),
  findByStudent: (studentId) => GransifModel.findByStudent(studentId),
  create: (data) => GransifModel.create(data),
  update: (id, data) => GransifModel.update(id, data),
  softDelete: (id, userId) => GransifModel.softDelete(id, userId),
  activate: (id, userId) => GransifModel.activate(id, userId),
};

module.exports = GransifRepository;