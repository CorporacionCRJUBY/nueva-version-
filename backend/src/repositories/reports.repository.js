// FILE: backend/src/repositories/reports.repository.js
const ReportsModel = require('../models/reports.model');

const ReportsRepository = {
  findAll: (filters) => ReportsModel.findAll(filters),
  count: (filters) => ReportsModel.count(filters),
  findById: (id) => ReportsModel.findById(id),
  findByCategory: (category) => ReportsModel.findByCategory(category),
  findByStudent: (studentId) => ReportsModel.findByStudent(studentId),
  create: (data) => ReportsModel.create(data),
  update: (id, data) => ReportsModel.update(id, data),
  softDelete: (id, userId) => ReportsModel.softDelete(id, userId),
};

module.exports = ReportsRepository;