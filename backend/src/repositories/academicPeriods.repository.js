// FILE: backend/src/repositories/academicPeriods.repository.js
const AcademicPeriodsModel = require('../models/academicPeriods.model');

const AcademicPeriodsRepository = {
  findAll: (filters) => AcademicPeriodsModel.findAll(filters),
  count: (filters) => AcademicPeriodsModel.count(filters),
  findById: (id) => AcademicPeriodsModel.findById(id),
  create: (data) => AcademicPeriodsModel.create(data),
  update: (id, data) => AcademicPeriodsModel.update(id, data),
  softDelete: (id, userId) => AcademicPeriodsModel.softDelete(id, userId),
  close: (id, userId) => AcademicPeriodsModel.close(id, userId),
  lock: (id, userId) => AcademicPeriodsModel.lock(id, userId),
};

module.exports = AcademicPeriodsRepository;