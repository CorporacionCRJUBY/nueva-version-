// FILE: database/migrations/054_add_users_2fa.js
exports.up = async function(knex) {
  const hasSecret = await knex.schema.hasColumn('users', 'twofa_secret');
  if (!hasSecret) {
    await knex.schema.alterTable('users', (table) => {
      // 057 amplía estas columnas a VARCHAR(255) para el cifrado AES-256-GCM.
      table.string('twofa_secret', 64).nullable();
      table.string('twofa_pending_secret', 64).nullable();
      table.boolean('twofa_enabled').notNullable().defaultTo(false);
      table.text('twofa_backup_codes').nullable();
      table.timestamp('twofa_enabled_at').nullable();
    });
  }
};

exports.down = async function(knex) {};