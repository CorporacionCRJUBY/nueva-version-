// FILE: backend/src/repositories/previousSchools.repository.js
const PreviousSchoolsModel = require('../models/previousSchools.model');

const PreviousSchoolsRepository = {
  findAll: (filters) => PreviousSchoolsModel.findAll(filters),
  count: (filters) => PreviousSchoolsModel.count(filters),
  findById: (id) => PreviousSchoolsModel.findById(id),
  findByStudent: (studentId) => PreviousSchoolsModel.findByStudent(studentId),
  create: (data) => PreviousSchoolsModel.create(data),
  update: (id, data) => PreviousSchoolsModel.update(id, data),
  softDelete: (id, userId) => PreviousSchoolsModel.softDelete(id, userId),
  deleteByStudent: (studentId) => PreviousSchoolsModel.deleteByStudent(studentId),
};

module.exports = PreviousSchoolsRepository;