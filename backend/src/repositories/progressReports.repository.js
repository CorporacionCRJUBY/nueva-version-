// FILE: backend/src/repositories/progressReports.repository.js
const ProgressReportsModel = require('../models/progressReports.model');

const ProgressReportsRepository = {
  findAll: (filters) => ProgressReportsModel.findAll(filters),
  count: (filters) => ProgressReportsModel.count(filters),
  findById: (id) => ProgressReportsModel.findById(id),
  findByStudent: (studentId) => ProgressReportsModel.findByStudent(studentId),
  findLatestByStudent: (studentId) => ProgressReportsModel.findLatestByStudent(studentId),
  create: (data) => ProgressReportsModel.create(data),
  update: (id, data) => ProgressReportsModel.update(id, data),
  softDelete: (id, userId) => ProgressReportsModel.softDelete(id, userId),
  generate: (id, generatedBy, pdfPath) => ProgressReportsModel.generate(id, generatedBy, pdfPath),
  archive: (id) => ProgressReportsModel.archive(id),
};

module.exports = ProgressReportsRepository;