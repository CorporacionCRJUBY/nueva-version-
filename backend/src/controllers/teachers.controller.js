// FILE: backend/src/controllers/teachers.controller.js
const teachersService = require('../services/teachers.service');

const findAll = async (req, res, next) => {
  try {
    const { page, pageSize, firstName, lastName, email, branchId, status, search } = req.query;
    const result = await teachersService.findAll(
      { page, pageSize, firstName, lastName, email, branchId, status, search },
      req.user
    );
    res.json({ success: true, data: result.data, total: result.total, page: result.page, pageSize: result.pageSize });
  } catch (error) {
    next(error);
  }
};

const findById = async (req, res, next) => {
  try {
    const data = await teachersService.findById(req.params.id, req.user);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getAssignments = async (req, res, next) => {
  try {
    const { academicYearId } = req.query;
    const data = await teachersService.getAssignments(
      req.params.id,
      { academicYearId },
      req.user
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await teachersService.create(req.body, req.user, req);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await teachersService.update(req.params.id, req.body, req.user, req);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const softDelete = async (req, res, next) => {
  try {
    await teachersService.softDelete(req.params.id, req.user, req);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  findAll,
  findById,
  getAssignments,
  create,
  update,
  softDelete,
};