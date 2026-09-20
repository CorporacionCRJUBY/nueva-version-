// FILE: database/migrations/036_create_school_calendar.js
exports.up = function(knex) {
  return knex.schema.createTable('school_calendar', (table) => {
    table.increments('id').primary();
    table.string('code', 20).notNullable().unique();
    table.integer('branch_id').unsigned().nullable();
    table.integer('academic_year_id').unsigned().nullable();
    table.date('date').notNullable();
    table.string('title', 100).notNullable();
    table.text('description');
    table.enum('event_type', ['HOLIDAY', 'EXAM', 'EVENT', 'MEETING', 'DEADLINE', 'OTHER']).notNullable();
    table.boolean('is_holiday').defaultTo(false);
    table.boolean('is_working_day').defaultTo(true);
    table.enum('status', ['ACTIVE', 'INACTIVE']).defaultTo('ACTIVE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    table.integer('deleted_by').unsigned().nullable();
    table.integer('created_by').unsigned().nullable();
    table.integer('updated_by').unsigned().nullable();
    table.foreign('branch_id').references('id').inTable('branches');
    table.foreign('academic_year_id').references('id').inTable('academic_years');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('school_calendar');
};