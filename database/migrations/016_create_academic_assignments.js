// FILE: database/migrations/016_create_academic_assignments.js
exports.up = function(knex) {
  return knex.schema.createTable('academic_assignments', (table) => {
    table.increments('id').primary();
    table.string('code', 20).notNullable().unique();
    table.integer('teacher_id').unsigned().notNullable();
    table.integer('subject_id').unsigned().notNullable();
    table.string('grade', 20).notNullable();
    table.string('section', 20);
    table.integer('branch_id').unsigned().notNullable();
    table.integer('academic_year_id').unsigned().notNullable();
    table.string('schedule');
    table.enum('status', ['ACTIVE', 'INACTIVE']).defaultTo('ACTIVE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    table.integer('deleted_by').unsigned().nullable();
    table.integer('created_by').unsigned().nullable();
    table.integer('updated_by').unsigned().nullable();
    table.foreign('teacher_id').references('id').inTable('teachers');
    table.foreign('subject_id').references('id').inTable('subjects');
    table.foreign('branch_id').references('id').inTable('branches');
    table.foreign('academic_year_id').references('id').inTable('academic_years');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('academic_assignments');
};