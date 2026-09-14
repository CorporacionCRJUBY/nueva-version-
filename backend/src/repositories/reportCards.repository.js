// FILE: backend/src/repositories/reportCards.repository.js
const ReportCardsModel = require('../models/reportCards.model');

const ReportCardsRepository = {
  findAll: (filters) => ReportCardsModel.findAll(filters),
  count: (filters) => ReportCardsModel.count(filters),
  findById: (id) => ReportCardsModel.findById(id),
  findByStudent: (studentId) => ReportCardsModel.findByStudent(studentId),
  findLatestByStudent: (studentId) => ReportCardsModel.findLatestByStudent(studentId),
  create: (data) => ReportCardsModel.create(data),
  update: (id, data) => ReportCardsModel.update(id, data),
  softDelete: (id, userId) => ReportCardsModel.softDelete(id, userId),
  generate: (id, generatedBy, pdfPath) => ReportCardsModel.generate(id, generatedBy, pdfPath),
  archive: (id) => ReportCardsModel.archive(id),
};

module.exports = ReportCardsRepository;