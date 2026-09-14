// FILE: backend/src/repositories/users.repository.js
const UsersModel = require('../models/users.model');

const UsersRepository = {
  findAll: (filters) => UsersModel.findAll(filters),
  count: (filters) => UsersModel.count(filters),
  findById: (id) => UsersModel.findById(id),
  findByEmail: (email) => UsersModel.findByEmail(email),
  findByRole: (roleId) => UsersModel.findByRole(roleId),
  findByBranch: (branchId) => UsersModel.findByBranch(branchId),
  create: (data) => UsersModel.create(data),
  update: (id, data) => UsersModel.update(id, data),
  softDelete: (id, userId) => UsersModel.softDelete(id, userId),
  updatePassword: (id, hashedPassword) => UsersModel.updatePassword(id, hashedPassword),
  updateLastLogin: (id) => UsersModel.updateLastLogin(id),
  incrementLoginAttempts: (id) => UsersModel.incrementLoginAttempts(id),
  registerFailedLogin: (id) => UsersModel.registerFailedLogin(id),
  isLocked: (user) => UsersModel.isLocked(user),
  resetLoginAttempts: (id) => UsersModel.resetLoginAttempts(id),
  assignRoles: (userId, roleIds) => UsersModel.assignRoles(userId, roleIds),
  clearRoles: (userId) => UsersModel.clearRoles(userId),
  ensureRole: (userId, roleId) => UsersModel.ensureRole(userId, roleId),
  replacePrimaryRole: (userId, oldRoleId, newRoleId) => UsersModel.replacePrimaryRole(userId, oldRoleId, newRoleId),
  getRoles: (userId) => UsersModel.getRoles(userId),
  getPermissions: (userId) => UsersModel.getPermissions(userId),
  findTwoFactorState: (id) => UsersModel.findTwoFactorState(id),
  setPendingTwoFactorSecret: (id, secret) => UsersModel.setPendingTwoFactorSecret(id, secret),
  enableTwoFactor: (id, secret, hashedBackupCodes) => UsersModel.enableTwoFactor(id, secret, hashedBackupCodes),
  upgradeTwoFactorSecret: (id, encryptedSecret) => UsersModel.upgradeTwoFactorSecret(id, encryptedSecret),
  disableTwoFactor: (id) => UsersModel.disableTwoFactor(id),
  replaceBackupCodes: (id, hashedBackupCodes) => UsersModel.replaceBackupCodes(id, hashedBackupCodes),
};

module.exports = UsersRepository;