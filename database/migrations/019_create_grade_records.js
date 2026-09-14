// FILE: database/migrations/019_create_grade_records.js
exports.up = function(knex) {
  return knex.schema.createTable('grade_records', (table) => {
    table.increments('id').primary();
    table.string('code', 20).notNullable().unique();
    table.integer('student_id').unsigned().notNullable();
    table.integer('subject_id').unsigned().notNullable();
    table.integer('assignment_id').unsigned().notNullable();
    table.integer('academic_period_id').unsigned().notNullable();
    table.decimal('grade_value', 5, 2).notNullable();
    table.string('grade_letter', 2);
    table.decimal('weight', 3, 2).defaultTo(1.0);
    table.enum('status', ['DRAFT', 'PUBLISHED', 'LOCKED', 'UNLOCKED']).defaultTo('DRAFT');
    table.timestamp('edit_deadline').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    table.integer('deleted_by').unsigned().nullable();
    table.integer('created_by').unsigned().nullable();
    table.integer('updated_by').unsigned().nullable();
    table.foreign('student_id').references('id').inTable('students');
    table.foreign('subject_id').references('id').inTable('subjects');
    table.foreign('assignment_id').references('id').inTable('academic_assignments');
    table.foreign('academic_period_id').references('id').inTable('academic_periods');
    table.unique(['student_id', 'subject_id', 'assignment_id', 'academic_period_id'], 'grade_records_unique_entry');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('grade_records');
};