// FILE: backend/src/repositories/audit.repository.js
const AuditModel = require('../models/audit.model');

const AuditRepository = {
  findAll: (filters) => AuditModel.findAll(filters),
  count: (filters) => AuditModel.count(filters),
  findById: (id) => AuditModel.findById(id),
  findByRecordCode: (recordCode) => AuditModel.findByRecordCode(recordCode),
  findByUser: (userId, limit) => AuditModel.findByUser(userId, limit),
  create: (data) => AuditModel.create(data),
};

module.exports = AuditRepository;