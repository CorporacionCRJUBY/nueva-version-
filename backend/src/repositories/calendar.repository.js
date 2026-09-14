// FILE: backend/src/repositories/calendar.repository.js
const CalendarModel = require('../models/calendar.model');

const CalendarRepository = {
  findAll: (filters) => CalendarModel.findAll(filters),
  count: (filters) => CalendarModel.count(filters),
  findById: (id) => CalendarModel.findById(id),
  findByMonth: (year, month, branchId, academicYearId, page, pageSize, branchIds) => CalendarModel.findByMonth(year, month, branchId, academicYearId, page, pageSize, branchIds),
  countByMonth: (year, month, branchId, academicYearId, branchIds) => CalendarModel.countByMonth(year, month, branchId, academicYearId, branchIds),
  findWorkingDays: (year, month, branchId) => CalendarModel.findWorkingDays(year, month, branchId),
  create: (data) => CalendarModel.create(data),
  update: (id, data) => CalendarModel.update(id, data),
  softDelete: (id, userId) => CalendarModel.softDelete(id, userId),
};

module.exports = CalendarRepository;