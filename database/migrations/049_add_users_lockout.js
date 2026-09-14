// FILE: database/migrations/049_add_users_lockout.js
exports.up = async function(knex) {
  const hasLockedUntil = await knex.schema.hasColumn('users', 'locked_until');
  if (!hasLockedUntil) {
    await knex.schema.alterTable('users', (table) => {
      table.timestamp('locked_until').nullable();
    });
  }
};

exports.down = async function(knex) {};