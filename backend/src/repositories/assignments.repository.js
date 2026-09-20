// FILE: backend/src/repositories/assignments.repository.js
const AssignmentsModel = require('../models/assignments.model');

const AssignmentsRepository = {
  findAll: (filters) => AssignmentsModel.findAll(filters),
  count: (filters) => AssignmentsModel.count(filters),
  findById: (id) => AssignmentsModel.findById(id),
  findByTeacher: (teacherId, academicYearId) => AssignmentsModel.findByTeacher(teacherId, academicYearId),
  findBySection: (sectionId, academicYearId) => AssignmentsModel.findBySection(sectionId, academicYearId),
  create: (data) => AssignmentsModel.create(data),
  update: (id, data) => AssignmentsModel.update(id, data),
  softDelete: (id, userId) => AssignmentsModel.softDelete(id, userId),
};

module.exports = AssignmentsRepository;