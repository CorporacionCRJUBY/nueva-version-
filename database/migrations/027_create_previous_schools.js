// FILE: database/migrations/027_create_previous_schools.js
exports.up = function(knex) {
  return knex.schema.createTable('previous_schools', (table) => {
    table.increments('id').primary();
    table.string('code', 20).notNullable().unique();
    table.integer('student_id').unsigned().notNullable();
    table.string('school_name', 100).notNullable();
    table.string('address', 255);
    table.string('phone', 20);
    table.string('grade_level', 50);
    table.string('year_attended', 20);
    table.boolean('transcript_received').defaultTo(false);
    table.text('notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    table.integer('deleted_by').unsigned().nullable();
    table.integer('created_by').unsigned().nullable();
    table.integer('updated_by').unsigned().nullable();
    table.foreign('student_id').references('id').inTable('students').onDelete('CASCADE');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('previous_schools');
};