// FILE: database/migrations/043_create_gransif_records.js
exports.up = function(knex) {
  return knex.schema.createTable('gransif_records', (table) => {
    table.increments('id').primary();
    table.string('code', 20).notNullable().unique();
    table.integer('student_id').unsigned().notNullable();
    table.integer('academic_year_id').unsigned().notNullable();
    table.date('assessment_date').notNullable();
    table.decimal('score', 5, 2);
    table.enum('status', ['PENDING', 'ACTIVE', 'COMPLETED']).defaultTo('PENDING');
    table.text('notes');
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
  return knex.schema.dropTable('gransif_records');
};