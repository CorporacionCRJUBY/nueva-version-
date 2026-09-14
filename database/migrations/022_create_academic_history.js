// FILE: database/migrations/022_create_academic_history.js
exports.up = function(knex) {
  return knex.schema.createTable('academic_history', (table) => {
    table.increments('id').primary();
    table.string('code', 20).notNullable().unique();
    table.integer('student_id').unsigned().notNullable();
    table.integer('academic_period_id').unsigned().notNullable();
    table.integer('academic_year_id').unsigned().notNullable();
    table.integer('subject_id').unsigned().notNullable();
    table.decimal('grade_value', 5, 2);
    table.string('grade_letter', 2);
    table.enum('status', ['DRAFT', 'PUBLISHED', 'LOCKED']).defaultTo('PUBLISHED');
    table.text('notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    table.integer('deleted_by').unsigned().nullable();
    table.integer('created_by').unsigned().nullable();
    table.integer('updated_by').unsigned().nullable();
    table.foreign('student_id').references('id').inTable('students');
    table.foreign('academic_period_id').references('id').inTable('academic_periods');
    table.foreign('academic_year_id').references('id').inTable('academic_years');
    table.foreign('subject_id').references('id').inTable('subjects');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('academic_history');
};