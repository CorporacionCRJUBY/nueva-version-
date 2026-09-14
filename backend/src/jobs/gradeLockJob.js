// FILE: backend/src/jobs/gradeLockJob.js
const db = require('../config/database');
const auditService = require('../services/audit.service');

/**
 * Bloquea automáticamente los registros de calificaciones cuyo deadline ha expirado
 * @returns {Promise<number>} Cantidad de registros bloqueados
 */
const lockExpiredGrades = async () => {
  try {
    const expiredRecords = await db('grade_records')
      .whereNotIn('status', ['LOCKED', 'UNLOCKED'])
      .whereRaw('edit_deadline < NOW()')
      .whereNull('deleted_at')
      .select('id', 'code', 'student_id', 'subject_id', 'grade_value', 'edit_deadline', 'status');

    if (expiredRecords.length === 0) {
      return 0;
    }

    const ids = expiredRecords.map(r => r.id);

    const updatedCount = await db.transaction(async (trx) => {
      const count = await trx('grade_records')
        .whereIn('id', ids)
        .update({
          status: 'LOCKED',
          updated_at: trx.fn.now(),
        });

      for (const record of expiredRecords) {
        await auditService.log({
          user: null, // Acción del sistema (sin usuario real)
          action: 'GRADE_AUTO_LOCK',
          module: 'grades',
          recordCode: record.code,
          before: { status: record.status || 'DRAFT', grade_value: record.grade_value },
          after: { status: 'LOCKED', grade_value: record.grade_value },
          reason: `Automatic grade lock after 24h deadline expired (${record.edit_deadline})`,
        });
      }

      return count;
    });

    console.log(`[GradeLockJob] ${updatedCount} grades automatically locked.`);
    return updatedCount;
  } catch (error) {
    console.error('[GradeLockJob] Error:', error.message);
    throw error;
  }
};

module.exports = { lockExpiredGrades };
