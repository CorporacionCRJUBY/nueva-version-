// FILE: database/migrations/051_fix_code_sequences_unique_constraint.js
exports.up = async function(knex) {
  // La migración 001 creó `prefix` como UNIQUE por sí solo, lo que impedía
  // reutilizar el mismo prefijo en distintos años. La secuencia debe ser
  // única por combinación prefix + year.
  const [oldUnique] = await knex.raw(
    "SELECT COUNT(*) AS n FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'code_sequences' AND index_name = 'code_sequences_prefix_unique'"
  );
  if (Number(oldUnique[0].n) > 0) {
    await knex.raw('ALTER TABLE code_sequences DROP INDEX code_sequences_prefix_unique');
  }

  const [newUnique] = await knex.raw(
    "SELECT COUNT(*) AS n FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'code_sequences' AND index_name = 'code_sequences_prefix_year_unique'"
  );
  if (Number(newUnique[0].n) === 0) {
    await knex.raw(
      'ALTER TABLE code_sequences ADD UNIQUE KEY code_sequences_prefix_year_unique (prefix, year)'
    );
  }
};

exports.down = async function(knex) {};