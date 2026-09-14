// FILE: database/migrations/056_add_active_uniqueness_and_job_indexes.js
// MySQL/MariaDB no soporta índices parciales: la unicidad "solo entre filas
// activas" se logra con una columna generada que vale 1 para filas activas y
// NULL para borradas (NULL nunca colisiona en un índice UNIQUE).
const ACTIVE_GUARD_SQL = 'tinyint GENERATED ALWAYS AS (IF(deleted_at IS NULL, 1, NULL)) VIRTUAL';

async function hasColumn(knex, table, column) {
  const [rows] = await knex.raw(
    'SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
    [table, column]
  );
  return Number(rows[0].n) > 0;
}

async function hasIndex(knex, table, indexName) {
  const [rows] = await knex.raw(
    'SELECT COUNT(*) AS n FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?',
    [table, indexName]
  );
  return Number(rows[0].n) > 0;
}

exports.up = async function(knex) {
  const guards = [
    { table: 'academic_history', unique: 'uq_academic_history_active', cols: ['student_id', 'academic_period_id', 'subject_id'] },
    { table: 'medical_records', unique: 'uq_medical_records_active', cols: ['student_id'] },
    { table: 'graduation_records', unique: 'uq_graduation_records_active', cols: ['student_id', 'academic_year_id'] },
    { table: 'gransif_records', unique: 'uq_gransif_records_active', cols: ['student_id', 'academic_year_id'] },
  ];

  for (const { table, unique, cols } of guards) {
    if (await hasColumn(knex, table, 'active_guard')) continue;
    await knex.schema.alterTable(table, (t) => {
      t.specificType('active_guard', ACTIVE_GUARD_SQL);
    });
    await knex.raw(`ALTER TABLE ${table} ADD UNIQUE KEY ${unique} (${[...cols, 'active_guard'].join(', ')})`);
  }

  // Índices para los jobs programados (cierre de períodos / archivo).
  if (!(await hasIndex(knex, 'grade_records', 'idx_grade_records_status_deadline'))) {
    await knex.raw('ALTER TABLE grade_records ADD INDEX idx_grade_records_status_deadline (status, edit_deadline)');
  }
  if (!(await hasIndex(knex, 'grade_change_requests', 'idx_grade_change_requests_record_status'))) {
    await knex.raw('ALTER TABLE grade_change_requests ADD INDEX idx_grade_change_requests_record_status (grade_record_id, status)');
  }
};

exports.down = async function(knex) {};