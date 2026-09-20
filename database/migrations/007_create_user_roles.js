// FILE: database/migrations/007_create_user_roles.js
exports.up = function(knex) {
  return knex.schema.createTable('user_roles', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.integer('role_id').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('role_id').references('id').inTable('roles').onDelete('CASCADE');
    table.unique(['user_id', 'role_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('user_roles');
};