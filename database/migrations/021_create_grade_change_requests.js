// FILE: database/migrations/021_create_grade_change_requests.js
exports.up = function(knex) {
  return knex.schema.createTable('grade_change_requests', (table) => {
    table.increments('id').primary();
    table.string('code', 20).notNullable().unique();
    table.integer('grade_record_id').unsigned().notNullable();
    table.integer('student_id').unsigned().notNullable();
    table.integer('requested_by').unsigned().notNullable();
    table.decimal('current_grade', 5, 2).notNullable();
    table.decimal('requested_grade', 5, 2).notNullable();
    table.text('reason').notNullable();
    table.enum('status', ['PENDING', 'APPROVED', 'REJECTED']).defaultTo('PENDING');
    table.integer('reviewed_by').unsigned().nullable();
    table.timestamp('reviewed_at').nullable();
    table.text('review_notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    table.integer('deleted_by').unsigned().nullable();
    table.foreign('grade_record_id').references('id').inTable('grade_records');
    table.foreign('student_id').references('id').inTable('students');
    table.foreign('requested_by').references('id').inTable('users');
    table.foreign('reviewed_by').references('id').inTable('users');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('grade_change_requests');
};