// FILE: database/migrations/035_create_medical_documents.js
exports.up = function(knex) {
  return knex.schema.createTable('medical_documents', (table) => {
    table.increments('id').primary();
    table.integer('medical_record_id').unsigned().notNullable();
    table.integer('document_id').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.foreign('medical_record_id').references('id').inTable('medical_records').onDelete('CASCADE');
    table.foreign('document_id').references('id').inTable('documents').onDelete('CASCADE');
    table.unique(['medical_record_id', 'document_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('medical_documents');
};