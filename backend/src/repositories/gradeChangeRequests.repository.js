// FILE: backend/src/repositories/gradeChangeRequests.repository.js
const GradeChangeRequestsModel = require('../models/gradeChangeRequests.model');

const GradeChangeRequestsRepository = {
  findAll: (filters) => GradeChangeRequestsModel.findAll(filters),
  count: (filters) => GradeChangeRequestsModel.count(filters),
  findById: (id) => GradeChangeRequestsModel.findById(id),
  findByStudent: (studentId) => GradeChangeRequestsModel.findByStudent(studentId),
  findByGradeRecord: (gradeRecordId) => GradeChangeRequestsModel.findByGradeRecord(gradeRecordId),
  create: (data) => GradeChangeRequestsModel.create(data),
  update: (id, data) => GradeChangeRequestsModel.update(id, data),
  softDelete: (id, userId) => GradeChangeRequestsModel.softDelete(id, userId),
  approve: (id, reviewerId, notes) => GradeChangeRequestsModel.approve(id, reviewerId, notes),
  reject: (id, reviewerId, notes) => GradeChangeRequestsModel.reject(id, reviewerId, notes),
};

module.exports = GradeChangeRequestsRepository;