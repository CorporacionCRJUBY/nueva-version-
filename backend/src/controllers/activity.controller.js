// FILE: backend/src/controllers/activity.controller.js
const activityService = require('../services/activity.service');

const findAll = async (req, res, next) => {
  try {
    const { page, pageSize, search, module, action } = req.query;
    const result = await activityService.findAll(
      { page, pageSize, search, module, action },
      req.user
    );
    // Bug fix: this wrapped the whole {data, page, pageSize} result under
    // `data` again (no `total` anywhere), which didn't match the envelope
    // every other list page relies on — same fix applied to Audit.
    res.json({ success: true, data: result.data, total: result.total, page: result.page, pageSize: result.pageSize });
  } catch (error) {
    next(error);
  }
};

const findById = async (req, res, next) => {
  try {
    const data = await activityService.findById(req.params.id, req.user);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getByUser = async (req, res, next) => {
  try {
    const { limit } = req.query;
    const data = await activityService.findByUser(
      req.params.userId,
      { limit: limit || 20 },
      req.user
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  findAll,
  findById,
  getByUser,
};