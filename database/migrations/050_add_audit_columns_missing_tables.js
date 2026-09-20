// FILE: database/migrations/050_add_audit_columns_missing_tables.js
exports.up = async function(knex) {
  // Tablas creadas antes de que las columnas de auditoría fueran la norma:
  // permissions, grade_change_requests, reports y transcripts.
  const tables = ['permissions', 'grade_change_requests', 'reports', 'transcripts'];

  for (const tableName of tables) {
    const hasCreatedBy = await knex.schema.hasColumn(tableName, 'created_by');
    if (!hasCreatedBy) {
      await knex.schema.alterTable(tableName, (table) => {
        table.integer('created_by').unsigned().nullable();
        table.integer('updated_by').unsigned().nullable();
        table.foreign('created_by').references('id').inTable('users');
        table.foreign('updated_by').references('id').inTable('users');
      });
    }
  }
};

exports.down = async function(knex) {};