// FILE: backend/src/jobs/reportArchiveJob.js
const db = require('../config/database');
const auditService = require('../services/audit.service');

// FIX (auditoria DB 2026-08-31): la versión anterior consultaba columnas que
// no existen (student_id, academic_period_id, report_type y code no están en
// report_versions/transcript_versions, y updated_at tampoco), escribía
// auditoría con user.id=0 (violaba la FK de audit_logs) y usaba el servicio
// de auditoría legacy. Ahora agrupa via JOIN con las tablas padre (reports /
// transcripts), que son las que tienen student, período, tipo y code.

/**
 * Ordena versiones y devuelve las que quedaron superadas por una OFFICIAL
 * más reciente dentro del mismo grupo.
 */
const supersededVersions = (versions) => {
  const officials = versions.filter((v) => v.status === 'OFFICIAL');
  if (officials.length === 0) return [];

  const byRecency = (a, b) =>
    new Date(b.generated_at || b.created_at).getTime() - new Date(a.generated_at || a.created_at).getTime() ||
    b.version_number - a.version_number;

  officials.sort(byRecency);
  const latest = officials[0];

  return versions
    .filter((v) => v.id !== latest.id && v.status !== 'ARCHIVED')
    .map((v) => ({ ...v, latestVersionNumber: latest.version_number }));
};

/**
 * Archiva versiones superadas agrupadas por clave de negocio.
 * @param {string} tableName - Tabla de versiones a actualizar
 * @param {Array} rows - Versiones ya con los datos del padre (code, grupo)
 * @param {Function} groupKeyOf - Calcula la clave de agrupación por fila
 * @param {string} moduleName - Módulo para la auditoría
 * @param {string} actionName - Acción para la auditoría
 * @returns {Promise<number>} Cantidad de versiones archivadas
 */
const archiveGroupedVersions = async (tableName, rows, groupKeyOf, moduleName, actionName) => {
  const groups = new Map();
  for (const row of rows) {
    const key = groupKeyOf(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  let archived = 0;
  for (const versions of groups.values()) {
    const toArchive = supersededVersions(versions);
    if (toArchive.length === 0) continue;

    const ids = toArchive.map((v) => v.id);
    await db.transaction(async (trx) => {
      // report_versions/transcript_versions no tienen updated_at.
      await trx(tableName).whereIn('id', ids).update({ status: 'ARCHIVED' });

      for (const version of toArchive) {
        await auditService.log({
          user: null, // Acción del sistema (sin usuario real)
          action: actionName,
          module: moduleName,
          recordCode: version.code,
          before: { status: version.status, version_number: version.version_number },
          after: { status: 'ARCHIVED' },
          reason: `Automatic archive: newer OFFICIAL version ${version.latestVersionNumber} exists`,
        });
      }
    });

    archived += toArchive.length;
  }
  return archived;
};

/**
 * Archiva versiones antiguas de reportes/transcripciones cuando existe una
 * versión OFFICIAL más nueva en el mismo grupo (estudiante + período + tipo).
 * @returns {Promise<{ archivedReports: number, archivedTranscripts: number }>}
 */
const archiveOldVersions = async () => {
  try {
    // 1. report_versions -> datos de grupo desde `reports`
    const reportRows = await db('report_versions as rv')
      .join('reports as r', 'r.id', 'rv.report_id')
      .whereNull('r.deleted_at')
      .select(
        'rv.id',
        'rv.status',
        'rv.version_number',
        'rv.generated_at',
        'rv.created_at',
        'r.code',
        'r.student_id',
        'r.academic_period_id',
        'r.category'
      );

    const archivedReports = await archiveGroupedVersions(
      'report_versions',
      reportRows,
      (row) => `${row.student_id}|${row.academic_period_id || 0}|${row.category}`,
      'reports',
      'REPORT_ARCHIVE'
    );

    // 2. transcript_versions -> datos de grupo desde `transcripts`
    const transcriptRows = await db('transcript_versions as tv')
      .join('transcripts as t', 't.id', 'tv.transcript_id')
      .whereNull('t.deleted_at')
      .select(
        'tv.id',
        'tv.status',
        'tv.version_number',
        'tv.generated_at',
        'tv.created_at',
        't.code',
        't.student_id',
        't.academic_period_id',
        't.transcript_type'
      );

    const archivedTranscripts = await archiveGroupedVersions(
      'transcript_versions',
      transcriptRows,
      (row) => `${row.student_id}|${row.academic_period_id || 0}|${row.transcript_type}`,
      'transcripts',
      'TRANSCRIPT_ARCHIVE'
    );

    console.log(`[ReportArchiveJob] Archivados: ${archivedReports} reports, ${archivedTranscripts} transcripts`);
    return { archivedReports, archivedTranscripts };
  } catch (error) {
    console.error('[ReportArchiveJob] Error:', error.message);
    throw error;
  }
};

module.exports = { archiveOldVersions };
