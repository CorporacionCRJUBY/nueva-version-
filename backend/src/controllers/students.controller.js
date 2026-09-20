// FILE: backend/src/controllers/students.controller.js
const studentsService = require('../services/students.service');

const findAll = async (req, res, next) => {
  try {
    const { page, pageSize, search, firstName, lastName, email, grade, section, branchId, academicYearId, status } = req.query;
    const result = await studentsService.findAll(
      { page, pageSize, search, firstName, lastName, email, grade, section, branchId, academicYearId, status },
      req.user
    );
    res.json({ success: true, data: result.data, total: result.total, page: result.page, pageSize: result.pageSize });
  } catch (error) {
    next(error);
  }
};

const findById = async (req, res, next) => {
  try {
    const data = await studentsService.findById(req.params.id, req.user);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getFullRecord = async (req, res, next) => {
  try {
    const data = await studentsService.getFullRecord(req.params.id, req.user);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await studentsService.create(req.body, req.user, req);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await studentsService.update(req.params.id, req.body, req.user, req);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status, reason, observation } = req.body;
    const data = await studentsService.updateStatus(
      req.params.id,
      status,
      { reason, observation },
      req.user,
      req
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const uploadPhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, code: 'NO_FILE', message: 'No photo uploaded' });
    }
    const data = await studentsService.uploadPhoto(req.params.id, req.file, req.user, req);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getPhoto = async (req, res, next) => {
  try {
    const { stream, filename, mimeType } = await studentsService.getPhoto(req.params.id, req.user);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

const softDelete = async (req, res, next) => {
  try {
    await studentsService.softDelete(req.params.id, req.user, req);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  findAll,
  findById,
  getFullRecord,
  create,
  update,
  updateStatus,
  uploadPhoto,
  getPhoto,
  softDelete,
};