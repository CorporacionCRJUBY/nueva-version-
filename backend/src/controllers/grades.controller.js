// FILE: backend/src/controllers/grades.controller.js
const gradesService = require('../services/grades.service');
const gradeChangeRequestsService = require('../services/gradeChangeRequests.service');

const findAll = async (req, res, next) => {
  try {
    const { page, pageSize, search, studentId, subjectId, assignmentId, academicPeriodId, status } = req.query;
    const result = await gradesService.findAll(
      { page, pageSize, search, studentId, subjectId, assignmentId, academicPeriodId, status },
      req.user
    );
    res.json({ success: true, data: result.data, total: result.total, page: result.page, pageSize: result.pageSize });
  } catch (error) {
    next(error);
  }
};

const findById = async (req, res, next) => {
  try {
    const data = await gradesService.findById(req.params.id, req.user);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await gradesService.create(req.body, req.user, req);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await gradesService.update(req.params.id, req.body, req.user, req);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const softDelete = async (req, res, next) => {
  try {
    await gradesService.softDelete(req.params.id, req.user, req);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};

const requestChange = async (req, res, next) => {
  try {
    const gradeRecord = await gradesService.findById(req.params.id, req.user);
    const data = await gradeChangeRequestsService.create({
      grade_record_id: gradeRecord.id,
      student_id: gradeRecord.student_id,
      current_grade: gradeRecord.grade_value,
      requested_grade: req.body.requested_grade,
      reason: req.body.reason
    }, req.user, req);
    res.status(201).json({ success: true, data });
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
  requestChange,
};
