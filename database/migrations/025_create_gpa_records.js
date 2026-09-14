// FILE: database/migrations/025_create_gpa_records.js
exports.up = function(knex) {
  return knex.schema.createTable('gpa_records', (table) => {
    table.increments('id').primary();
    table.string('code', 20).notNullable().unique();
    table.integer('student_id').unsigned().notNullable();
    table.integer('academic_period_id').unsigned().notNullable();
    table.integer('academic_year_id').unsigned().notNullable();
    table.decimal('gpa_value', 5, 3).notNullable();
    table.decimal('cumulative_gpa', 5, 3).defaultTo(0);
    table.decimal('credit_hours', 5, 2).defaultTo(0);
    table.enum('status', ['PENDING', 'APPROVED']).defaultTo('PENDING');
    table.timestamp('calculation_date').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    table.integer('deleted_by').unsigned().nullable();
    table.integer('created_by').unsigned().nullable();
    table.integer('updated_by').unsigned().nullable();
    table.foreign('student_id').references('id').inTable('students');
    table.foreign('academic_period_id').references('id').inTable('academic_periods');
    table.foreign('academic_year_id').references('id').inTable('academic_years');
    table.unique(['student_id', 'academic_period_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('gpa_records');
};