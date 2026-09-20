// FILE: database/migrations/004_create_permissions.js
exports.up = function(knex) {
  return knex.schema.createTable('permissions', (table) => {
    table.increments('id').primary();
    table.string('code', 20).notNullable().unique();
    table.string('module', 50).notNullable();
    table.string('action', 50).notNullable();
    table.string('description', 255);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    table.integer('deleted_by').unsigned().nullable();
    table.unique(['module', 'action']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('permissions');
};