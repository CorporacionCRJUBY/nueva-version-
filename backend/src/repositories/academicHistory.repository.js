// FILE: backend/src/repositories/academicHistory.repository.js
const AcademicHistoryModel = require('../models/academicHistory.model');

const AcademicHistoryRepository = {
  findAll: (filters) => AcademicHistoryModel.findAll(filters),
  count: (filters) => AcademicHistoryModel.count(filters),
  findById: (id) => AcademicHistoryModel.findById(id),
  findByStudent: (studentId) => AcademicHistoryModel.findByStudent(studentId),
  create: (data) => AcademicHistoryModel.create(data),
  update: (id, data) => AcademicHistoryModel.update(id, data),
  softDelete: (id, userId) => AcademicHistoryModel.softDelete(id, userId),
};

module.exports = AcademicHistoryRepository;