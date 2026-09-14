// FILE: database/migrations/015_create_academic_periods.js
exports.up = function(knex) {
  return knex.schema.createTable('academic_periods', (table) => {
    table.increments('id').primary();
    table.string('code', 20).notNullable().unique();
    table.integer('academic_year_id').unsigned().notNullable();
    table.string('name', 50).notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.enum('status', ['OPEN', 'CLOSED', 'LOCKED']).defaultTo('OPEN');
    table.boolean('is_active').defaultTo(false);
    table.json('grading_config');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    table.integer('deleted_by').unsigned().nullable();
    table.integer('created_by').unsigned().nullable();
    table.integer('updated_by').unsigned().nullable();
    table.foreign('academic_year_id').references('id').inTable('academic_years').onDelete('CASCADE');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('academic_periods');
};