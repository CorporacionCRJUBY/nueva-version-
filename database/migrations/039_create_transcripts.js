// FILE: database/migrations/039_create_transcripts.js
exports.up = function(knex) {
  return knex.schema.createTable('transcripts', (table) => {
    table.increments('id').primary();
    table.string('code', 20).notNullable().unique();
    table.integer('student_id').unsigned().notNullable();
    table.integer('academic_period_id').unsigned().nullable();
    table.integer('academic_year_id').unsigned().nullable();
    table.enum('transcript_type', ['OFFICIAL', 'UNOFFICIAL']).notNullable();
    table.enum('status', ['DRAFT', 'OFFICIAL', 'ARCHIVED', 'REPRINTED']).defaultTo('DRAFT');
    table.integer('version_number').defaultTo(1);
    table.string('pdf_path', 255);
    table.string('pdf_url', 255);
    table.integer('generated_by').unsigned().nullable();
    table.integer('approved_by').unsigned().nullable();
    table.timestamp('approved_at').nullable();
    table.text('notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    table.integer('deleted_by').unsigned().nullable();
    table.foreign('student_id').references('id').inTable('students');
    table.foreign('academic_period_id').references('id').inTable('academic_periods');
    table.foreign('academic_year_id').references('id').inTable('academic_years');
    table.foreign('generated_by').references('id').inTable('users');
    table.foreign('approved_by').references('id').inTable('users');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('transcripts');
};