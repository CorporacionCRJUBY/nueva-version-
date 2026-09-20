// FILE: backend/src/repositories/graduation.repository.js
const GraduationModel = require('../models/graduation.model');

const GraduationRepository = {
  findAll: (filters) => GraduationModel.findAll(filters),
  count: (filters) => GraduationModel.count(filters),
  findById: (id) => GraduationModel.findById(id),
  findByStudent: (studentId) => GraduationModel.findByStudent(studentId),
  create: (data) => GraduationModel.create(data),
  update: (id, data) => GraduationModel.update(id, data),
  softDelete: (id, userId) => GraduationModel.softDelete(id, userId),
  validate: (id, userId, validationNotes, requirementsMet) => GraduationModel.validate(id, userId, validationNotes, requirementsMet),
};

module.exports = GraduationRepository;