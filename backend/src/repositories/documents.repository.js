// FILE: backend/src/repositories/documents.repository.js
const DocumentsModel = require('../models/documents.model');

const DocumentsRepository = {
  findAll: (filters) => DocumentsModel.findAll(filters),
  count: (filters) => DocumentsModel.count(filters),
  findById: (id) => DocumentsModel.findById(id),
  findByStudent: (studentId) => DocumentsModel.findByStudent(studentId),
  create: (data) => DocumentsModel.create(data),
  update: (id, data) => DocumentsModel.update(id, data),
  softDelete: (id, userId) => DocumentsModel.softDelete(id, userId),
};

module.exports = DocumentsRepository;