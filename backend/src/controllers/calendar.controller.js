// FILE: backend/src/controllers/calendar.controller.js
const calendarService = require('../services/calendar.service');

const findAll = async (req, res, next) => {
  try {
    const { page, pageSize, search, year, month, branchId, academicYearId, eventType, status } = req.query;
    const result = await calendarService.findAll(
      { page, pageSize, search, year, month, branchId, academicYearId, eventType, status },
      req.user
    );
    res.json({ success: true, data: result.data, total: result.total, page: result.page, pageSize: result.pageSize });
  } catch (error) {
    next(error);
  }
};

const findById = async (req, res, next) => {
  try {
    const data = await calendarService.findById(req.params.id, req.user);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getByMonth = async (req, res, next) => {
  try {
    const { year, month } = req.params;
    const { branchId, academicYearId, page, pageSize } = req.query;
    const result = await calendarService.getByMonth(
      { year: parseInt(year), month: parseInt(month), branchId, academicYearId, page, pageSize },
      req.user
    );
    res.json({ success: true, data: result.data, total: result.total, page: result.page, pageSize: result.pageSize });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await calendarService.create(req.body, req.user, req);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await calendarService.update(req.params.id, req.body, req.user, req);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const softDelete = async (req, res, next) => {
  try {
    await calendarService.softDelete(req.params.id, req.user, req);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  findAll,
  findById,
  getByMonth,
  create,
  update,
  softDelete,
};