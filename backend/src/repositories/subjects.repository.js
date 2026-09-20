// FILE: backend/src/repositories/subjects.repository.js
const SubjectsModel = require('../models/subjects.model');

const SubjectsRepository = {
  findAll: (filters) => SubjectsModel.findAll(filters),
  count: (filters) => SubjectsModel.count(filters),
  findById: (id) => SubjectsModel.findById(id),
  findByGrade: (grade) => SubjectsModel.findByGrade(grade),
  findByBranch: (branchId) => SubjectsModel.findByBranch(branchId),
  create: (data) => SubjectsModel.create(data),
  update: (id, data) => SubjectsModel.update(id, data),
  softDelete: (id, userId) => SubjectsModel.softDelete(id, userId),
};

module.exports = SubjectsRepository;