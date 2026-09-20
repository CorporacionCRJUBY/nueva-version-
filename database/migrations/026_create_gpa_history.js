// FILE: database/migrations/026_create_gpa_history.js
exports.up = function(knex) {
  return knex.schema.createTable('gpa_history', (table) => {
    table.increments('id').primary();
    table.integer('gpa_record_id').unsigned().notNullable();
    table.decimal('from_gpa', 5, 3);
    table.decimal('to_gpa', 5, 3).notNullable();
    table.text('reason');
    table.integer('changed_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.foreign('gpa_record_id').references('id').inTable('gpa_records').onDelete('CASCADE');
    table.foreign('changed_by').references('id').inTable('users');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('gpa_history');
};