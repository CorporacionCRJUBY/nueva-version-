// FILE: database/migrations/020_create_grade_history.js
exports.up = function(knex) {
  return knex.schema.createTable('grade_history', (table) => {
    table.increments('id').primary();
    table.integer('grade_record_id').unsigned().notNullable();
    table.decimal('from_grade', 5, 2);
    table.decimal('to_grade', 5, 2).notNullable();
    table.string('from_letter', 2);
    table.string('to_letter', 2);
    table.text('reason');
    table.integer('changed_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.foreign('grade_record_id').references('id').inTable('grade_records').onDelete('CASCADE');
    table.foreign('changed_by').references('id').inTable('users');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('grade_history');
};