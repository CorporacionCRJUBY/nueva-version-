// FILE: backend/src/repositories/students.repository.js
const StudentsModel = require('../models/students.model');

const StudentsRepository = {
  findAll: (filters) => StudentsModel.findAll(filters),
  count: (filters) => StudentsModel.count(filters),
  findById: (id) => StudentsModel.findById(id),
  findByUser: (userId) => StudentsModel.findByUser(userId),
  findByEmail: (email) => StudentsModel.findByEmail(email),
  findByCode: (code) => StudentsModel.findByCode(code),
  findFullRecord: (id) => StudentsModel.findFullRecord(id),
  create: (data) => StudentsModel.create(data),
  update: (id, data) => StudentsModel.update(id, data),
  softDelete: (id, userId) => StudentsModel.softDelete(id, userId),
  updateStatus: (id, status, userId) => StudentsModel.updateStatus(id, status, userId),
};

module.exports = StudentsRepository;