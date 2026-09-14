// FILE: database/migrations/060_add_active_uniqueness_grades_attendance.js
// Igual que la 056: unicidad de filas activas vía columna generada
// active_guard (1 activa / NULL borrada), ahora para grades y attendance.
//
// FIX (QA): MariaDB/MySQL rechazan `DROP INDEX` sobre un índice que está
// sirviendo de respaldo a una FOREIGN KEY ("needed in a foreign key
// constraint"). En `grade_records`, la FK `grade_records_student_id_foreign`
// no tiene índice propio y usaba `grade_records_unique_entry` (student_id es
// su columna más a la izquierda). Por eso:
//   1) creamos primero los índices dedicados que las FKs necesitan
//      (`idx_grade_records_student_id`, `idx_attendance_records_assignment_id`,
//      `idx_attendance_records_student_id`), y
//   2) recién entonces recreamos la unicidad incluyendo `active_guard`.
// La migración es idempotente: se puede re-ejecutar sin efectos secundarios.

const ACTIVE_GUARD_SQL = 'tinyint GENERATED ALWAYS AS (IF(deleted_at IS NULL, 1, NULL)) VIRTUAL';

/** ¿Existe la columna? (consulta directa a information_schema) */
async function hasColumn(knex, table, column) {
  const [rows] = await knex.raw(
    'SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
    [table, column]
  );
  return Number(rows[0].n) > 0;
}

/** ¿Existe el índice? */
async function hasIndex(knex, table, indexName) {
  const [rows] = await knex.raw(
    'SELECT COUNT(*) AS n FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?',
    [table, indexName]
  );
  return Number(rows[0].n) > 0;
}

/** ¿El índice ya incluye la columna? (para saber si hay que recrearlo) */
async function indexHasColumn(knex, table, indexName, columnName) {
  const [rows] = await knex.raw(
    'SELECT COUNT(*) AS n FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ? AND column_name = ?',
    [table, indexName, columnName]
  );
  return Number(rows[0].n) > 0;
}

/** Añade el índice de respaldo para la FK si no existe (idempotente). */
async function ensureHelperIndex(knex, table, indexName, columnName) {
  if (!(await hasIndex(knex, table, indexName))) {
    await knex.raw(`ALTER TABLE ${table} ADD INDEX ${indexName} (${columnName})`);
  }
}

/**
 * Reemplaza un índice único por su versión con `active_guard`, sin romper las
 * FOREIGN KEYs que puedan estar apoyándose en él.
 *
 * Clave: TODOS los índices de respaldo (`helpers`) se crean ANTES de soltar el
 * índice único, porque MariaDB no permite dejar una FK sin índice de soporte
 * en ningún instante intermedio.
 */
async function replaceUniqueWithActiveGuard(knex, { table, indexName, columns, helpers = [] }) {
  if (!(await hasColumn(knex, table, 'active_guard'))) {
    await knex.schema.alterTable(table, (t) => {
      t.specificType('active_guard', ACTIVE_GUARD_SQL);
    });
  }

  // Si ya fue migrado (el índice ya incluye active_guard), no hacemos nada.
  if (await indexHasColumn(knex, table, indexName, 'active_guard')) return;

  // 1) Aseguramos el soporte de TODAS las FKs afectadas.
  for (const h of helpers) {
    await ensureHelperIndex(knex, table, h.name, h.column);
  }

  // 2) Ahora sí es seguro soltar el índice único original.
  if (await hasIndex(knex, table, indexName)) {
    await knex.raw(`ALTER TABLE ${table} DROP INDEX ${indexName}`);
  }

  // 3) Y recrearlo incluyendo la columna generada.
  await knex.raw(
    `ALTER TABLE ${table} ADD UNIQUE KEY ${indexName} (${[...columns, 'active_guard'].join(', ')})`
  );
}

exports.up = async function (knex) {
  // grade_records: la FK de student_id se apoyaba en el índice único.
  // (subject_id / assignment_id / academic_period_id ya tienen índice propio.)
  await replaceUniqueWithActiveGuard(knex, {
    table: 'grade_records',
    indexName: 'grade_records_unique_entry',
    columns: ['student_id', 'subject_id', 'assignment_id', 'academic_period_id', 'grade_type'],
    helpers: [{ name: 'idx_grade_records_student_id', column: 'student_id' }],
  });

  // attendance_records: el índice único es la primera columna tanto de la FK
  // de assignment_id como de la de student_id, así que ambos necesitan su
  // propio índice antes de soltarlo.
  await replaceUniqueWithActiveGuard(knex, {
    table: 'attendance_records',
    indexName: 'attendance_records_assignment_id_student_id_date_unique',
    columns: ['assignment_id', 'student_id', 'date'],
    helpers: [
      { name: 'idx_attendance_records_assignment_id', column: 'assignment_id' },
      { name: 'idx_attendance_records_student_id', column: 'student_id' },
    ],
  });
};

exports.down = async function () {
  // Reversible solo con pérdida de la semántica de borrado lógico; se deja
  // intencionalmente vacío (igual que 056).
};
