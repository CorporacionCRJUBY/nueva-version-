// FILE: backend/src/repositories/academicYears.repository.js
const AcademicYearsModel = require('../models/academicYears.model');

const AcademicYearsRepository = {
  findAll: (filters) => AcademicYearsModel.findAll(filters),
  count: (filters) => AcademicYearsModel.count(filters),
  findById: (id) => AcademicYearsModel.findById(id),
  findActive: () => AcademicYearsModel.findActive(),
  deactivateAllExcept: (exceptId) => AcademicYearsModel.deactivateAllExcept(exceptId),
  create: (data) => AcademicYearsModel.create(data),
  update: (id, data) => AcademicYearsModel.update(id, data),
  softDelete: (id, userId) => AcademicYearsModel.softDelete(id, userId),
};

module.exports = AcademicYearsRepository;