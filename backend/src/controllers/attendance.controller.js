// FILE: backend/src/controllers/attendance.controller.js
const attendanceService = require('../services/attendance.service');

const findAll = async (req, res, next) => {
  try {
    const { page, pageSize, search, assignmentId, studentId, dateFrom, dateTo, status } = req.query;
    const result = await attendanceService.findAll(
      { page, pageSize, search, assignmentId, studentId, dateFrom, dateTo, status },
      req.user
    );
    res.json({ success: true, data: result.data, total: result.total, page: result.page, pageSize: result.pageSize });
  } catch (error) {
    next(error);
  }
};

const getMonthlyGrid = async (req, res, next) => {
  try {
    const { assignmentId, year, month } = req.params;
    const data = await attendanceService.getMonthlyGrid(
      { assignmentId, year: parseInt(year, 10), month: parseInt(month, 10) },
      req.user
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getStudentMonthlyReport = async (req, res, next) => {
  try {
    const { studentId, year, month } = req.params;
    const data = await attendanceService.getStudentMonthlyReport(
      studentId,
      parseInt(year, 10),
      parseInt(month, 10)
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const findById = async (req, res, next) => {
  try {
    const data = await attendanceService.findById(req.params.id, req.user);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await attendanceService.create(req.body, req.user, req);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const saveDaily = async (req, res, next) => {
  try {
    const data = await attendanceService.saveDaily(req.body, req.user, req);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await attendanceService.update(req.params.id, req.body, req.user, req);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const softDelete = async (req, res, next) => {
  try {
    await attendanceService.softDelete(req.params.id, req.user, req);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  findAll,
  getMonthlyGrid,
  getStudentMonthlyReport,
  findById,
  create,
  saveDaily,
  update,
  softDelete,
};
