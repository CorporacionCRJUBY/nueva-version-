// FILE: backend/src/repositories/attendance.repository.js
const AttendanceModel = require('../models/attendance.model');

const AttendanceRepository = {
  findAll: (filters) => AttendanceModel.findAll(filters),
  count: (filters) => AttendanceModel.count(filters),
  findById: (id) => AttendanceModel.findById(id),
  findDaily: (assignmentId, date) => AttendanceModel.findDaily(assignmentId, date),
  findMonthly: (assignmentId, year, month) => AttendanceModel.findMonthly(assignmentId, year, month),
  create: (data) => AttendanceModel.create(data),
  upsert: (data) => AttendanceModel.upsert(data),
  update: (id, data) => AttendanceModel.update(id, data),
  softDelete: (id, userId) => AttendanceModel.softDelete(id, userId),
  bulkCreate: (records) => AttendanceModel.bulkCreate(records),
  bulkUpsert: (records) => AttendanceModel.bulkUpsert(records),
};

module.exports = AttendanceRepository;