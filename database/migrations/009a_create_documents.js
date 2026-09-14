// FILE: database/migrations/009a_create_documents.js
// (Originally authored/numbered as 031_create_documents.js and later
// renumbered to 009a so `documents` exists before the tables that reference
// it — e.g. 030_create_scholarship_documents.js and
// 035_create_medical_documents.js. The header above previously still said
// "031", which didn't match the actual filename/migration order.)
exports.up = function(knex) {
  return knex.schema.createTable('documents', (table) => {
    table.increments('id').primary();
    table.string('code', 20).notNullable().unique();
    table.integer('student_id').unsigned().notNullable();
    table.string('document_type', 50).notNullable();
    table.string('title', 100).notNullable();
    table.string('file_path', 255).notNullable();
    table.string('file_name', 100).notNullable();
    table.integer('file_size');
    table.string('mime_type', 50);
    table.enum('status', ['ACTIVE', 'INACTIVE']).defaultTo('ACTIVE');
    table.date('upload_date').notNullable();
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
  return knex.schema.dropTable('documents');
};