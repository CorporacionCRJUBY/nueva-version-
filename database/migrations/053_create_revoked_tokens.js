// FILE: database/migrations/053_create_revoked_tokens.js
exports.up = async function(knex) {
  const [tables] = await knex.raw(
    "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'revoked_tokens'"
  );
  if (Number(tables[0].n) === 0) {
    await knex.schema.createTable('revoked_tokens', (table) => {
      table.increments('id').primary();
      table.string('jti', 36).notNullable().unique();
      table.integer('user_id').unsigned().nullable();
      // 058 extiende este enum con '2fa_challenge'.
      table.enum('token_type', ['access', 'refresh']).notNullable();
      table.timestamp('expires_at').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.index(['expires_at']);
    });
  }
};

exports.down = async function(knex) {};