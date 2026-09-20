// FILE: database/migrations/017_create_attendance_records.js
exports.up = function(knex) {
  return knex.schema.createTable('attendance_records', (table) => {
    table.increments('id').primary();
    table.string('code', 20).notNullable().unique();
    table.integer('assignment_id').unsigned().notNullable();
    table.integer('student_id').unsigned().notNullable();
    table.date('date').notNullable();
    table.enum('status', ['P', 'O', 'E', 'U']).notNullable();
    table.time('check_in_time').nullable();
    table.time('check_out_time').nullable();
    table.text('notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    table.integer('deleted_by').unsigned().nullable();
    table.integer('created_by').unsigned().nullable();
    table.integer('updated_by').unsigned().nullable();
    table.foreign('assignment_id').references('id').inTable('academic_assignments');
    table.foreign('student_id').references('id').inTable('students');
    table.unique(['assignment_id', 'student_id', 'date']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('attendance_records');
};