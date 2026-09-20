// FILE: database/migrations/030_create_scholarship_documents.js
exports.up = function(knex) {
  return knex.schema.createTable('scholarship_documents', (table) => {
    table.increments('id').primary();
    table.integer('scholarship_id').unsigned().notNullable();
    table.integer('document_id').unsigned().notNullable();
    table.text('notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.foreign('scholarship_id').references('id').inTable('scholarships').onDelete('CASCADE');
    table.foreign('document_id').references('id').inTable('documents').onDelete('CASCADE');
    table.unique(['scholarship_id', 'document_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('scholarship_documents');
};