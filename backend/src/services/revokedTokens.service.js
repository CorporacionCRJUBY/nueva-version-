'use strict';

const revokedTokensRepository = require('../repositories/revokedTokens.repository');

async function revokeByUser(userId, options = {}) {
  return revokedTokensRepository.revokeForUser(userId, options);
}

async function isRevoked(token) {
  return revokedTokensRepository.isRevoked(token);
}

async function revoke(token, options = {}) {
  return revokedTokensRepository.revoke(token, options);
}

module.exports = {
  revoke,
  revokeByUser,
  isRevoked,
};
