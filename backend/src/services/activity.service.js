// FILE: backend/src/services/activity.service.js
const AppError = require('../utils/AppError');
const repository = require('../repositories/activity.repository');

const ActivityService = {
  async findAll(filters, user) {
    const { page = 1, pageSize = 20, search, module, action } = filters;
    const queryFilters = { search, module, action };
    const [data, total] = await Promise.all([
      repository.findAll({ ...queryFilters, page, pageSize }),
      repository.count(queryFilters),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  },

  async findById(id, user) {
    const record = await repository.findById(id);
    if (!record) throw new AppError('Activity record not found', 404);
    return record;
  },

  async findByUser(userId, filters, user) {
    const { limit = 20 } = filters;
    return repository.findByUser(userId, limit);
  }
};

module.exports = ActivityService;