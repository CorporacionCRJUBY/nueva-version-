// FILE: database/migrations/033_create_document_types.js
exports.up = function(knex) {
  return knex.schema.createTable('document_types', (table) => {
    table.increments('id').primary();
    table.string('code', 20).notNullable().unique();
    table.string('name', 50).notNullable();
    table.string('description', 255);
    table.string('icon', 50);
    table.enum('status', ['ACTIVE', 'INACTIVE']).defaultTo('ACTIVE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('document_types');
};