// FILE: database/migrations/055_add_password_changed_at_and_nullable_audit_user.js
exports.up = async function(knex) {
  const hasPasswordChangedAt = await knex.schema.hasColumn('users', 'password_changed_at');
  if (!hasPasswordChangedAt) {
    await knex.schema.alterTable('users', (table) => {
      table.timestamp('password_changed_at').nullable();
    });
  }

  // Las acciones del sistema (jobs programados) se auditan sin usuario.
  const [rows] = await knex.raw('SHOW COLUMNS FROM audit_logs LIKE ?', ['user_id']);
  if (rows.length > 0 && rows[0].Null !== 'YES') {
    await knex.schema.alterTable('audit_logs', (table) => {
      table.integer('user_id').unsigned().nullable().alter();
    });
  }
};

exports.down = async function(knex) {};