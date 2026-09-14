// FILE: database/migrations/024_create_credit_history.js
exports.up = function(knex) {
  return knex.schema.createTable('credit_history', (table) => {
    table.increments('id').primary();
    table.integer('credit_id').unsigned().notNullable();
    table.decimal('from_credits', 5, 2);
    table.decimal('to_credits', 5, 2).notNullable();
    table.text('reason');
    table.integer('changed_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.foreign('credit_id').references('id').inTable('credits').onDelete('CASCADE');
    table.foreign('changed_by').references('id').inTable('users');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('credit_history');
};