// FILE: backend/src/repositories/teachers.repository.js
const TeachersModel = require('../models/teachers.model');

const TeachersRepository = {
  findAll: (filters) => TeachersModel.findAll(filters),
  count: (filters) => TeachersModel.count(filters),
  findById: (id) => TeachersModel.findById(id),
  findByUser: (userId) => TeachersModel.findByUser(userId),
  findByEmail: (email) => TeachersModel.findByEmail(email),
  findByBranch: (branchId) => TeachersModel.findByBranch(branchId),
  create: (data) => TeachersModel.create(data),
  update: (id, data) => TeachersModel.update(id, data),
  softDelete: (id, userId) => TeachersModel.softDelete(id, userId),
  getAssignments: (teacherId, academicYearId) => TeachersModel.getAssignments(teacherId, academicYearId),
};

module.exports = TeachersRepository;