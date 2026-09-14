// FILE: backend/src/controllers/academicPeriods.controller.js
const academicPeriodsService = require('../services/academicPeriods.service');

const findAll = async (req, res, next) => {
  try {
    const { page, pageSize, academicYearId, status, search } = req.query;
    const result = await academicPeriodsService.findAll(
      { page, pageSize, academicYearId, status, search },
      req.user
    );
    res.json({ success: true, data: result.data, total: result.total, page: result.page, pageSize: result.pageSize });
  } catch (error) {
    next(error);
  }
};

const findById = async (req, res, next) => {
  try {
    const data = await academicPeriodsService.findById(req.params.id, req.user);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await academicPeriodsService.create(req.body, req.user, req);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await academicPeriodsService.update(req.params.id, req.body, req.user, req);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const softDelete = async (req, res, next) => {
  try {
    await academicPeriodsService.softDelete(req.params.id, req.user, req);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};

const close = async (req, res, next) => {
  try {
    const data = await academicPeriodsService.close(req.params.id, req.user, req);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const lock = async (req, res, next) => {
  try {
    const data = await academicPeriodsService.lock(req.params.id, req.user, req);
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
  close,
  lock,
};