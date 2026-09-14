// FILE: backend/src/controllers/previousSchools.controller.js
const previousSchoolsService = require('../services/previousSchools.service');

const findAll = async (req, res, next) => {
  try {
    const { page, pageSize, search, studentId, schoolName } = req.query;
    const result = await previousSchoolsService.findAll(
      { page, pageSize, search, studentId, schoolName },
      req.user
    );
    res.json({ success: true, data: result.data, total: result.total, page: result.page, pageSize: result.pageSize });
  } catch (error) {
    next(error);
  }
};

const findById = async (req, res, next) => {
  try {
    const data = await previousSchoolsService.findById(req.params.id, req.user);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getByStudent = async (req, res, next) => {
  try {
    const data = await previousSchoolsService.findByStudent(req.params.studentId, req.user);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await previousSchoolsService.create(req.body, req.user, req);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await previousSchoolsService.update(req.params.id, req.body, req.user, req);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const softDelete = async (req, res, next) => {
  try {
    await previousSchoolsService.softDelete(req.params.id, req.user, req);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  findAll,
  findById,
  getByStudent,
  create,
  update,
  softDelete,
};