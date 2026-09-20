// FILE: database/migrations/044_create_activity_logs.js
exports.up = function(knex) {
  return knex.schema.createTable('activity_logs', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.string('module', 50).notNullable();
    table.string('action', 50).notNullable();
    table.string('record_code', 20);
    table.json('details');
    table.string('ip', 45);
    table.string('user_agent', 255);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.foreign('user_id').references('id').inTable('users');
    table.index(['user_id', 'module', 'created_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('activity_logs');
};