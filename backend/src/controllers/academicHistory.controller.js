'use strict';

const academicHistoryService = require('../services/academicHistory.service');

async function getAcademicHistory(req, res, next) {
  try {
    const params = {
      search: req.query.search,
      studentId: req.query.studentId,
      academicYearId: req.query.academicYearId,
      periodId: req.query.academicPeriodId,
      status: req.query.status,
      page: req.query.page,
      pageSize: req.query.pageSize,
    };

    const result = await academicHistoryService.findAll(params, req.user);

    return res.json({
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    });
  } catch (error) {
    return next(error);
  }
}

async function findById(req, res, next) {
  try {
    const data = await academicHistoryService.findById(req.params.id, req.user);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function getByStudent(req, res, next) {
  try {
    const data = await academicHistoryService.findByStudent(req.params.studentId, req.user);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function createAcademicHistory(req, res, next) {
  try {
    const result = await academicHistoryService.create(req.body, req.user, req);
    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateAcademicHistory(req, res, next) {
  try {
    const result = await academicHistoryService.update(req.params.id, req.body, req.user, req);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function deleteAcademicHistory(req, res, next) {
  try {
    await academicHistoryService.softDelete(req.params.id, req.user, req);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAcademicHistory,
  findById,
  getByStudent,
  createAcademicHistory,
  updateAcademicHistory,
  deleteAcademicHistory,
};