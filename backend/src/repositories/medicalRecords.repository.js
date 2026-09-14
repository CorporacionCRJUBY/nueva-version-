// FILE: backend/src/repositories/medicalRecords.repository.js
const MedicalRecordsModel = require('../models/medicalRecords.model');

const MedicalRecordsRepository = {
  findAll: (filters) => MedicalRecordsModel.findAll(filters),
  count: (filters) => MedicalRecordsModel.count(filters),
  findById: (id) => MedicalRecordsModel.findById(id),
  findByStudent: (studentId) => MedicalRecordsModel.findByStudent(studentId),
  create: (data) => MedicalRecordsModel.create(data),
  update: (id, data) => MedicalRecordsModel.update(id, data),
  softDelete: (id, userId) => MedicalRecordsModel.softDelete(id, userId),
};

module.exports = MedicalRecordsRepository;