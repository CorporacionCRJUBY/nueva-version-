// FILE: backend/src/controllers/transcripts.controller.js
const transcriptsService = require('../services/transcripts.service');

const findAll = async (req, res, next) => {
  try {
    const { page, pageSize, search, studentId, academicPeriodId, academicYearId, status, transcriptType } = req.query;
    const result = await transcriptsService.findAll(
      { page, pageSize, search, studentId, academicPeriodId, academicYearId, status, transcriptType },
      req.user
    );
    res.json({ success: true, data: result.data, total: result.total, page: result.page, pageSize: result.pageSize });
  } catch (error) {
    next(error);
  }
};

const findById = async (req, res, next) => {
  try {
    const data = await transcriptsService.findById(req.params.id, req.user);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await transcriptsService.create(req.body, req.user, req);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await transcriptsService.update(req.params.id, req.body, req.user, req);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const softDelete = async (req, res, next) => {
  try {
    await transcriptsService.softDelete(req.params.id, req.user, req);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};

const generate = async (req, res, next) => {
  try {
    const data = await transcriptsService.generate(req.params.id, req.user, req);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const preview = async (req, res, next) => {
  try {
    const { stream, filename, mimeType } = await transcriptsService.preview(req.params.id, req.user);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

const reprint = async (req, res, next) => {
  try {
    const data = await transcriptsService.reprint(req.params.id, req.user, req);
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
  generate,
  preview,
  reprint,
};