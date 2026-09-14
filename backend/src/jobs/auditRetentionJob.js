'use strict';

const cron = require('node-cron');
const db = require('../config/database');
const logger = require('../utils/logger');

const RETENTION_DAYS = Number(process.env.AUDIT_RETENTION_DAYS) || 90;
const SCHEDULE = process.env.AUDIT_RETENTION_JOB_SCHEDULE || '0 4 * * *';

let scheduledTask = null;
let started = false;

async function run() {
  try {
    const table = 'audit_logs';
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

    const deleted = await db(table)
      .where('created_at', '<', cutoff)
      .del();

    if (deleted && deleted > 0) {
      logger.info(`[auditRetentionJob] Deleted ${deleted} audit records older than ${RETENTION_DAYS} days`);
    } else {
      logger.debug('[auditRetentionJob] No audit records to delete');
    }
  } catch (error) {
    logger.error('[auditRetentionJob] Retention cleanup failed:', error.message);
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
    logger.info(`[auditRetentionJob] Scheduled with expression ${SCHEDULE} (retention ${RETENTION_DAYS} days)`);
  }
}

function stop() {
  if (scheduledTask && scheduledTask.stop) {
    scheduledTask.stop();
    scheduledTask = null;
  }
  started = false;
  logger.info('[auditRetentionJob] Stopped');
}

function status() {
  return {
    started,
    schedule: SCHEDULE,
    retentionDays: RETENTION_DAYS,
  };
}

module.exports = {
  start,
  stop,
  run,
  status,
};
