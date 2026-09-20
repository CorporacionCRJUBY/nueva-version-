// FILE: database/migrations/042_create_graduation_records.js
exports.up = function(knex) {
  return knex.schema.createTable('graduation_records', (table) => {
    table.increments('id').primary();
    table.string('code', 20).notNullable().unique();
    table.integer('student_id').unsigned().notNullable();
    table.integer('academic_year_id').unsigned().notNullable();
    table.date('graduation_date').notNullable();
    table.enum('status', ['PENDING', 'VALIDATED', 'COMPLETED']).defaultTo('PENDING');
    table.boolean('requirements_met').defaultTo(false);
    table.text('validation_notes');
    table.string('certificate_number', 50);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    table.integer('deleted_by').unsigned().nullable();
    table.integer('created_by').unsigned().nullable();
    table.integer('updated_by').unsigned().nullable();
    table.foreign('student_id').references('id').inTable('students');
    table.foreign('academic_year_id').references('id').inTable('academic_years');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('graduation_records');
};