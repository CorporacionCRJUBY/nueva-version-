// FILE: database/migrations/040_create_transcript_courses.js
exports.up = function(knex) {
  return knex.schema.createTable('transcript_courses', (table) => {
    table.increments('id').primary();
    table.integer('transcript_id').unsigned().notNullable();
    table.integer('subject_id').unsigned().notNullable();
    table.decimal('grade_value', 5, 2);
    table.string('grade_letter', 2);
    table.decimal('credits', 5, 2);
    table.text('notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.foreign('transcript_id').references('id').inTable('transcripts').onDelete('CASCADE');
    table.foreign('subject_id').references('id').inTable('subjects');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('transcript_courses');
};