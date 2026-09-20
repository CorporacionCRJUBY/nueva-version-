// FILE: backend/src/controllers/reports.controller.js
const reportsService = require('../services/reports.service');

const findAll = async (req, res, next) => {
  try {
    const { page, pageSize, search, category, status, studentId, academicPeriodId, dateFrom, dateTo } = req.query;
    const result = await reportsService.findAll(
      { page, pageSize, search, category, status, studentId, academicPeriodId, dateFrom, dateTo },
      req.user
    );
    res.json({ success: true, data: result.data, total: result.total, page: result.page, pageSize: result.pageSize });
  } catch (error) {
    next(error);
  }
};

const findById = async (req, res, next) => {
  try {
    const data = await reportsService.findById(req.params.id, req.user);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const preview = async (req, res, next) => {
  try {
    const { stream, filename, mimeType } = await reportsService.preview(req.params.id, req.user);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  findAll,
  findById,
  preview,
};