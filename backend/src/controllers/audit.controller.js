// FILE: backend/src/controllers/audit.controller.js
const auditService = require('../services/audit.service');

const findAll = async (req, res, next) => {
  try {
    const { page, pageSize, search, userId, module, action, recordCode, dateFrom, dateTo } = req.query;
    const result = await auditService.findAll(
      { page, pageSize, search, userId, module, action, recordCode, dateFrom, dateTo },
      req.user
    );
    // Bug fix: this used to wrap the whole {data, page, pageSize} result
    // under `data` again (giving `{success, data: {data, page, pageSize}}`
    // with no `total` anywhere), which didn't match the `{success, data,
    // total, page, pageSize}` envelope every other list page relies on.
    res.json({ success: true, data: result.data, total: result.total, page: result.page, pageSize: result.pageSize });
  } catch (error) {
    next(error);
  }
};

const findById = async (req, res, next) => {
  try {
    const data = await auditService.findById(req.params.id, req.user);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getByRecord = async (req, res, next) => {
  try {
    const data = await auditService.findByRecordCode(req.params.code, req.user);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  findAll,
  findById,
  getByRecord,
};