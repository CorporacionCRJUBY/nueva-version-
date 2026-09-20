// FILE: database/migrations/007a_create_academic_years.js
// (Originally authored/numbered as 014_create_academic_years.js and later
// renumbered to 007a so `academic_years` exists before the tables that
// reference it earlier in the sequence — e.g. 008_create_students.js, which
// has a foreign key to academic_years. The header above previously still
// said "014_..." from before the renumbering; corrected here.)
exports.up = function(knex) {
  return knex.schema.createTable('academic_years', (table) => {
    table.increments('id').primary();
    table.string('code', 20).notNullable().unique();
    table.string('name', 50).notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.enum('status', ['ACTIVE', 'INACTIVE']).defaultTo('ACTIVE');
    table.boolean('is_active').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    table.integer('deleted_by').unsigned().nullable();
    table.integer('created_by').unsigned().nullable();
    table.integer('updated_by').unsigned().nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('academic_years');
};