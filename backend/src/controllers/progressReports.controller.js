// FILE: backend/src/controllers/progressReports.controller.js
const progressReportsService = require('../services/progressReports.service');

const findAll = async (req, res, next) => {
  try {
    const { page, pageSize, search, studentId, academicPeriodId, academicYearId, status } = req.query;
    const result = await progressReportsService.findAll(
      { page, pageSize, search, studentId, academicPeriodId, academicYearId, status },
      req.user
    );
    res.json({ success: true, data: result.data, total: result.total, page: result.page, pageSize: result.pageSize });
  } catch (error) {
    next(error);
  }
};

const findById = async (req, res, next) => {
  try {
    const data = await progressReportsService.findById(req.params.id, req.user);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await progressReportsService.create(req.body, req.user, req);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await progressReportsService.update(req.params.id, req.body, req.user, req);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const softDelete = async (req, res, next) => {
  try {
    await progressReportsService.softDelete(req.params.id, req.user, req);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};

const generate = async (req, res, next) => {
  try {
    const data = await progressReportsService.generate(req.params.id, req.user, req);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const preview = async (req, res, next) => {
  try {
    const { stream, filename, mimeType } = await progressReportsService.preview(req.params.id, req.user);
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
  create,
  update,
  softDelete,
  generate,
  preview,
};