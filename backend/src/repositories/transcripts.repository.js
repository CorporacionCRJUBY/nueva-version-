// FILE: backend/src/repositories/transcripts.repository.js
const TranscriptsModel = require('../models/transcripts.model');

const TranscriptsRepository = {
  findAll: (filters) => TranscriptsModel.findAll(filters),
  count: (filters) => TranscriptsModel.count(filters),
  findById: (id) => TranscriptsModel.findById(id),
  findByStudent: (studentId) => TranscriptsModel.findByStudent(studentId),
  findLatestByStudent: (studentId, transcriptType) => TranscriptsModel.findLatestByStudent(studentId, transcriptType),
  create: (data) => TranscriptsModel.create(data),
  update: (id, data) => TranscriptsModel.update(id, data),
  softDelete: (id, userId) => TranscriptsModel.softDelete(id, userId),
  generate: (id, generatedBy, pdfPath) => TranscriptsModel.generate(id, generatedBy, pdfPath),
  reprint: (id, generatedBy, pdfPath) => TranscriptsModel.reprint(id, generatedBy, pdfPath),
  archive: (id) => TranscriptsModel.archive(id),
};

module.exports = TranscriptsRepository;