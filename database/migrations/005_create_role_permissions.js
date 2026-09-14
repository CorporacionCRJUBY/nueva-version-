// FILE: database/migrations/005_create_role_permissions.js
exports.up = function (knex) {
  return knex.schema.createTable('role_permissions', (table) => {
    table.increments('id').primary();
    table.integer('role_id').unsigned().notNullable()
      .references('id').inTable('roles').onDelete('CASCADE');
    table.integer('permission_id').unsigned().notNullable()
      .references('id').inTable('permissions').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['role_id', 'permission_id']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('role_permissions');
};