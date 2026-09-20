// FILE: database/migrations/009_create_student_status_history.js
exports.up = function(knex) {
  return knex.schema.createTable('student_status_history', (table) => {
    table.increments('id').primary();
    table.integer('student_id').unsigned().notNullable();
    table.enum('from_status', ['ACTIVE', 'INACTIVE', 'GRADUATED', 'WITHDRAWN', 'TRANSFERRED', 'SUSPENDED']);
    table.enum('to_status', ['ACTIVE', 'INACTIVE', 'GRADUATED', 'WITHDRAWN', 'TRANSFERRED', 'SUSPENDED']).notNullable();
    table.text('reason');
    table.text('observation');
    table.integer('changed_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.foreign('student_id').references('id').inTable('students').onDelete('CASCADE');
    table.foreign('changed_by').references('id').inTable('users');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('student_status_history');
};