// FILE: backend/src/repositories/gpa.repository.js
const GPAModel = require('../models/gpa.model');

const GPARepository = {
  findAll: (filters) => GPAModel.findAll(filters),
  count: (filters) => GPAModel.count(filters),
  findById: (id) => GPAModel.findById(id),
  findByStudent: (studentId) => GPAModel.findByStudent(studentId),
  findByStudentAndPeriod: (studentId, academicPeriodId) => GPAModel.findByStudentAndPeriod(studentId, academicPeriodId),
  create: (data) => GPAModel.create(data),
  update: (id, data) => GPAModel.update(id, data),
  softDelete: (id, userId) => GPAModel.softDelete(id, userId),
  deleteByStudent: (studentId) => GPAModel.deleteByStudent(studentId),
};

module.exports = GPARepository;