// FILE: database/migrations/001_create_code_sequences.js
exports.up = function(knex) {
  return knex.schema.createTable('code_sequences', (table) => {
    table.increments('id').primary();
    table.string('prefix', 10).notNullable().unique();
    table.integer('last_number').defaultTo(0);
    table.integer('year').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('code_sequences');
};