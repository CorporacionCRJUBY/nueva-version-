// FILE: backend/src/controllers/roles.controller.js
const rolesService = require('../services/roles.service');

const findAll = async (req, res, next) => {
  try {
    const { page, pageSize, search, name, status } = req.query;
    const result = await rolesService.findAll(
      { page, pageSize, search, name, status },
      req.user
    );
    res.json({ success: true, data: result.data, total: result.total, page: result.page, pageSize: result.pageSize });
  } catch (error) {
    next(error);
  }
};

const findById = async (req, res, next) => {
  try {
    const data = await rolesService.findById(req.params.id, req.user);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await rolesService.create(req.body, req.user, req);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await rolesService.update(req.params.id, req.body, req.user, req);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const softDelete = async (req, res, next) => {
  try {
    await rolesService.softDelete(req.params.id, req.user, req);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};

const assignPermissions = async (req, res, next) => {
  try {
    const { permissionIds } = req.body;
    const data = await rolesService.assignPermissions(req.params.id, permissionIds, req.user, req);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getPermissions = async (req, res, next) => {
  try {
    const data = await rolesService.getPermissions(req.params.id, req.user);
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
  assignPermissions,
  getPermissions,
};