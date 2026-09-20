// FILE: database/migrations/052_widen_record_code_columns.js
exports.up = async function(knex) {
  for (const tableName of ['activity_logs', 'audit_logs']) {
    const [rows] = await knex.raw(
      "SELECT character_maximum_length AS w FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = 'record_code'",
      [tableName]
    );
    if (rows.length > 0 && Number(rows[0].w) < 100) {
      await knex.schema.alterTable(tableName, (table) => {
        table.string('record_code', 100).alter();
      });
    }
  }
};

exports.down = async function(knex) {};