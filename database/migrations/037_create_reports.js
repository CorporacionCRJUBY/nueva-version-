// FILE: database/migrations/037_create_reports.js
exports.up = function(knex) {
  return knex.schema.createTable('reports', (table) => {
    table.increments('id').primary();
    table.string('code', 20).notNullable().unique();
    table.enum('category', ['attendance', 'grades', 'progress-reports', 'report-cards', 'academic-history', 'transcripts', 'scholarships', 'graduation']).notNullable();
    table.integer('student_id').unsigned().notNullable();
    table.integer('academic_period_id').unsigned().nullable();
    table.integer('academic_year_id').unsigned().nullable();
    table.date('report_date').notNullable();
    table.enum('status', ['DRAFT', 'OFFICIAL', 'ARCHIVED', 'REPRINTED']).defaultTo('DRAFT');
    table.integer('version_number').defaultTo(1);
    table.string('pdf_path', 255);
    table.string('pdf_url', 255);
    table.integer('generated_by').unsigned().nullable();
    table.text('notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    table.integer('deleted_by').unsigned().nullable();
    table.foreign('student_id').references('id').inTable('students');
    table.foreign('academic_period_id').references('id').inTable('academic_periods');
    table.foreign('academic_year_id').references('id').inTable('academic_years');
    table.foreign('generated_by').references('id').inTable('users');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('reports');
};