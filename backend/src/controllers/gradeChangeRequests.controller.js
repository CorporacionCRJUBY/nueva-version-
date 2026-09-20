// FILE: backend/src/controllers/gradeChangeRequests.controller.js
const gradeChangeRequestsService = require('../services/gradeChangeRequests.service');

const findAll = async (req, res, next) => {
  try {
    const { page, pageSize, studentId, gradeRecordId, status, dateFrom, dateTo } = req.query;
    const result = await gradeChangeRequestsService.findAll(
      { page, pageSize, studentId, gradeRecordId, status, dateFrom, dateTo },
      req.user
    );
    res.json({ success: true, data: result.data, total: result.total, page: result.page, pageSize: result.pageSize });
  } catch (error) {
    next(error);
  }
};

const findById = async (req, res, next) => {
  try {
    const data = await gradeChangeRequestsService.findById(req.params.id, req.user);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await gradeChangeRequestsService.create(req.body, req.user, req);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await gradeChangeRequestsService.update(req.params.id, req.body, req.user, req);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const softDelete = async (req, res, next) => {
  try {
    await gradeChangeRequestsService.softDelete(req.params.id, req.user, req);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};

const approve = async (req, res, next) => {
  try {
    const data = await gradeChangeRequestsService.approve(req.params.id, req.body, req.user, req);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const reject = async (req, res, next) => {
  try {
    const data = await gradeChangeRequestsService.reject(req.params.id, req.body, req.user, req);
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
  approve,
  reject,
};