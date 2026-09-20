// FILE: backend/src/controllers/scholarships.controller.js
const scholarshipsService = require('../services/scholarships.service');

const findAll = async (req, res, next) => {
  try {
    const { page, pageSize, search, studentId, scholarshipType, status, academicYearId } = req.query;
    const result = await scholarshipsService.findAll(
      { page, pageSize, search, studentId, scholarshipType, status, academicYearId },
      req.user
    );
    res.json({ success: true, data: result.data, total: result.total, page: result.page, pageSize: result.pageSize });
  } catch (error) {
    next(error);
  }
};

const findById = async (req, res, next) => {
  try {
    const data = await scholarshipsService.findById(req.params.id, req.user);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await scholarshipsService.create(req.body, req.user, req);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await scholarshipsService.update(req.params.id, req.body, req.user, req);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const softDelete = async (req, res, next) => {
  try {
    await scholarshipsService.softDelete(req.params.id, req.user, req);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    const data = await scholarshipsService.updateStatus(
      req.params.id,
      status,
      reason,
      req.user,
      req
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getHistory = async (req, res, next) => {
  try {
    const data = await scholarshipsService.getHistory(req.params.id, req.user);
    res.json({ success: true, data });
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
  updateStatus,
  getHistory,
};