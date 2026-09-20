// FILE: backend/src/repositories/scholarships.repository.js
const ScholarshipsModel = require('../models/scholarships.model');

const ScholarshipsRepository = {
  findAll: (filters) => ScholarshipsModel.findAll(filters),
  count: (filters) => ScholarshipsModel.count(filters),
  findById: (id) => ScholarshipsModel.findById(id),
  findByStudent: (studentId) => ScholarshipsModel.findByStudent(studentId),
  create: (data) => ScholarshipsModel.create(data),
  update: (id, data) => ScholarshipsModel.update(id, data),
  softDelete: (id, userId) => ScholarshipsModel.softDelete(id, userId),
  updateStatus: (id, status, userId, reason) => ScholarshipsModel.updateStatus(id, status, userId, reason),
  addStatusHistory: (params) => ScholarshipsModel.addStatusHistory(params),
  getStatusHistory: (scholarshipId) => ScholarshipsModel.getStatusHistory(scholarshipId),
};

module.exports = ScholarshipsRepository;