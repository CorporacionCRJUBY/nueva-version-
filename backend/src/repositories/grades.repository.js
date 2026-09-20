// FILE: backend/src/repositories/grades.repository.js
const GradesModel = require('../models/grades.model');

const GradesRepository = {
  findAll: (filters) => GradesModel.findAll(filters),
  count: (filters) => GradesModel.count(filters),
  findById: (id) => GradesModel.findById(id),
  findByStudent: (studentId) => GradesModel.findByStudent(studentId),
  findByAssignment: (assignmentId) => GradesModel.findByAssignment(assignmentId),
  findByStudentAndPeriod: (studentId, academicPeriodId) => GradesModel.findByStudentAndPeriod(studentId, academicPeriodId),
  create: (data) => GradesModel.create(data),
  update: (id, data) => GradesModel.update(id, data),
  softDelete: (id, userId) => GradesModel.softDelete(id, userId),
  lock: (id, userId) => GradesModel.lock(id, userId),
  unlock: (id, userId) => GradesModel.unlock(id, userId),
  bulkCreate: (records) => GradesModel.bulkCreate(records),
  bulkUpdate: (records) => GradesModel.bulkUpdate(records),
};

module.exports = GradesRepository;