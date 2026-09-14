// FILE: backend/src/repositories/activity.repository.js
const ActivityModel = require('../models/activity.model');

const ActivityRepository = {
  findAll: (filters) => ActivityModel.findAll(filters),
  count: (filters) => ActivityModel.count(filters),
  findById: (id) => ActivityModel.findById(id),
  findByUser: (userId, limit) => ActivityModel.findByUser(userId, limit),
  create: (data) => ActivityModel.create(data),
};

module.exports = ActivityRepository;