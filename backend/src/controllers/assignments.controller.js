// FILE: backend/src/controllers/assignments.controller.js
const assignmentsService = require('../services/assignments.service');

const findAll = async (req, res, next) => {
  try {
    const { page, pageSize, search, teacherId, subjectId, grade, section, branchId, academicYearId, status } = req.query;
    const result = await assignmentsService.findAll(
      { page, pageSize, search, teacherId, subjectId, grade, section, branchId, academicYearId, status },
      req.user
    );
    res.json({ success: true, data: result.data, total: result.total, page: result.page, pageSize: result.pageSize });
  } catch (error) {
    next(error);
  }
};

const findById = async (req, res, next) => {
  try {
    const data = await assignmentsService.findById(req.params.id, req.user);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getByTeacher = async (req, res, next) => {
  try {
    const { academicYearId } = req.query;
    const data = await assignmentsService.findByTeacher(
      req.params.teacherId,
      { academicYearId },
      req.user
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getBySection = async (req, res, next) => {
  try {
    const { academicYearId } = req.query;
    const data = await assignmentsService.findBySection(
      req.params.section,
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
    const data = await assignmentsService.create(req.body, req.user, req);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await assignmentsService.update(req.params.id, req.body, req.user, req);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const softDelete = async (req, res, next) => {
  try {
    await assignmentsService.softDelete(req.params.id, req.user, req);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  findAll,
  findById,
  getByTeacher,
  getBySection,
  create,
  update,
  softDelete,
};