// FILE: database/migrations/002_create_branches.js
exports.up = function(knex) {
  return knex.schema.createTable('branches', (table) => {
    table.increments('id').primary();
    table.string('code', 20).notNullable().unique();
    table.string('name', 100).notNullable();
    table.string('address', 255);
    table.string('phone', 20);
    table.string('email', 100);
    table.enum('status', ['ACTIVE', 'INACTIVE']).defaultTo('ACTIVE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    table.integer('deleted_by').unsigned().nullable();
    table.integer('created_by').unsigned().nullable();
    table.integer('updated_by').unsigned().nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('branches');
};