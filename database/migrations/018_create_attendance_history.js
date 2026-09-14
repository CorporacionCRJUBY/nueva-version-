// FILE: database/migrations/018_create_attendance_history.js
exports.up = function(knex) {
  return knex.schema.createTable('attendance_history', (table) => {
    table.increments('id').primary();
    table.integer('attendance_record_id').unsigned().notNullable();
    table.enum('from_status', ['P', 'O', 'E', 'U']);
    table.enum('to_status', ['P', 'O', 'E', 'U']).notNullable();
    table.text('reason');
    table.integer('changed_by').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.foreign('attendance_record_id').references('id').inTable('attendance_records').onDelete('CASCADE');
    table.foreign('changed_by').references('id').inTable('users');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('attendance_history');
};