// FILE: database/migrations/006_create_users.js
exports.up = function(knex) {
  return knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('code', 20).notNullable().unique();
    table.string('email', 100).notNullable().unique();
    table.string('password', 255).notNullable();
    table.string('full_name', 100).notNullable();
    table.string('phone', 20);
    table.integer('role_id').unsigned().nullable();
    table.integer('branch_id').unsigned().nullable();
    table.enum('status', ['ACTIVE', 'INACTIVE', 'SUSPENDED']).defaultTo('ACTIVE');
    table.timestamp('last_login').nullable();
    table.integer('login_attempts').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    table.integer('deleted_by').unsigned().nullable();
    table.integer('created_by').unsigned().nullable();
    table.integer('updated_by').unsigned().nullable();
    table.foreign('role_id').references('id').inTable('roles');
    table.foreign('branch_id').references('id').inTable('branches');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('users');
};