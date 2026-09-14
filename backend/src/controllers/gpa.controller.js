// FILE: backend/src/controllers/gpa.controller.js
const gpaService = require('../services/gpa.service');

const findAll = async (req, res, next) => {
  try {
    const { page, pageSize, search, studentId, academicPeriodId, academicYearId, status } = req.query;
    const result = await gpaService.findAll(
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
    const data = await gpaService.findById(req.params.id, req.user);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await gpaService.create(req.body, req.user, req);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await gpaService.update(req.params.id, req.body, req.user, req);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const softDelete = async (req, res, next) => {
  try {
    await gpaService.softDelete(req.params.id, req.user, req);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};

const recalculate = async (req, res, next) => {
  try {
    const data = await gpaService.recalculate(req.params.studentId, req.user, req);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getCumulative = async (req, res, next) => {
  try {
    const data = await gpaService.getCumulative(req.params.studentId, req.user);
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
  recalculate,
  getCumulative,
};