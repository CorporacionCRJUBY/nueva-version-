// FILE: database/migrations/032_create_document_folders.js
exports.up = function(knex) {
  return knex.schema.createTable('document_folders', (table) => {
    table.increments('id').primary();
    table.string('name', 50).notNullable();
    table.string('description', 255);
    table.integer('parent_id').unsigned().nullable();
    table.enum('status', ['ACTIVE', 'INACTIVE']).defaultTo('ACTIVE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.foreign('parent_id').references('id').inTable('document_folders').onDelete('CASCADE');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('document_folders');
};