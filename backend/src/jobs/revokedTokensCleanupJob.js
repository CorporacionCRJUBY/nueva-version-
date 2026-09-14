'use strict';

const cron = require('node-cron');
const revokedTokensRepository = require('../repositories/revokedTokens.repository');
const logger = require('../utils/logger');

const SCHEDULE = process.env.JOBS_REVOKED_TOKENS_CLEANUP_SCHEDULE || '0 3 * * *';

let scheduledTask = null;

let started = false;

async function run() {
  try {
    const deleted = await revokedTokensRepository.cleanExpired();
    if (deleted && deleted > 0) {
      logger.info(`[revokedTokensCleanupJob] Cleaned ${deleted} expired revoked tokens`);
    } else {
      logger.debug('[revokedTokensCleanupJob] No expired revoked tokens to clean');
    }
  } catch (error) {
    logger.error('[revokedTokensCleanupJob] Cleanup failed:', error.message);
  }
}

function start() {
  if (started) {
    return;
  }

  if (cron.schedule) {
    scheduledTask = cron.schedule(SCHEDULE, run, {
      timezone: process.env.TZ || 'UTC',
    });
    started = true;
    logger.info(`[revokedTokensCleanupJob] Scheduled with expression ${SCHEDULE}`);
  }
}

function stop() {
  if (scheduledTask && scheduledTask.stop) {
    scheduledTask.stop();
    scheduledTask = null;
  }
  started = false;
  logger.info('[revokedTokensCleanupJob] Stopped');
}

function status() {
  return {
    started,
    schedule: SCHEDULE,
  };
}

module.exports = {
  start,
  stop,
  run,
  status,
};
