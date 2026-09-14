// FILE: backend/src/repositories/credits.repository.js
const CreditsModel = require('../models/credits.model');

const CreditsRepository = {
  findAll: (filters) => CreditsModel.findAll(filters),
  count: (filters) => CreditsModel.count(filters),
  findById: (id) => CreditsModel.findById(id),
  findByStudent: (studentId) => CreditsModel.findByStudent(studentId),
  findByStudentAndPeriod: (studentId, academicPeriodId) => CreditsModel.findByStudentAndPeriod(studentId, academicPeriodId),
  create: (data) => CreditsModel.create(data),
  update: (id, data) => CreditsModel.update(id, data),
  softDelete: (id, userId) => CreditsModel.softDelete(id, userId),
  deleteByStudent: (studentId) => CreditsModel.deleteByStudent(studentId),
};

module.exports = CreditsRepository;