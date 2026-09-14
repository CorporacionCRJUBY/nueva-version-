// FILE: database/migrations/038_create_report_versions.js
exports.up = function(knex) {
  return knex.schema.createTable('report_versions', (table) => {
    table.increments('id').primary();
    table.integer('report_id').unsigned().notNullable();
    table.integer('version_number').notNullable();
    table.enum('status', ['DRAFT', 'OFFICIAL', 'ARCHIVED', 'REPRINTED']).defaultTo('DRAFT');
    table.string('pdf_path', 255);
    table.string('pdf_url', 255);
    table.integer('generated_by').unsigned().nullable();
    table.timestamp('generated_at').defaultTo(knex.fn.now());
    table.text('version_notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.foreign('report_id').references('id').inTable('reports').onDelete('CASCADE');
    table.foreign('generated_by').references('id').inTable('users');
    table.unique(['report_id', 'version_number']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('report_versions');
};