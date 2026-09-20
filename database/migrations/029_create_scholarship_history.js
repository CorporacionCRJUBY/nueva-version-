// FILE: database/migrations/029_create_scholarship_history.js
exports.up = function(knex) {
  return knex.schema.createTable('scholarship_history', (table) => {
    table.increments('id').primary();
    table.integer('scholarship_id').unsigned().notNullable();
    table.enum('from_status', ['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED']);
    table.enum('to_status', ['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED']).notNullable();
    table.text('reason');
    table.integer('changed_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.foreign('scholarship_id').references('id').inTable('scholarships').onDelete('CASCADE');
    table.foreign('changed_by').references('id').inTable('users');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('scholarship_history');
};