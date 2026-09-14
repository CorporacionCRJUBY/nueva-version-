// FILE: database/migrations/010_create_teachers.js
exports.up = function(knex) {
  return knex.schema.createTable('teachers', (table) => {
    table.increments('id').primary();
    table.string('code', 20).notNullable().unique();
    table.integer('user_id').unsigned().nullable();
    table.string('first_name', 50).notNullable();
    table.string('middle_name', 50).nullable();
    table.string('last_name', 50).notNullable();
    table.string('identification_number', 50).nullable();
    table.string('photo_url', 255).nullable();
    table.string('email', 100).notNullable().unique();
    table.string('phone', 20);
    table.string('specialization', 100);
    table.date('hire_date').notNullable();
    table.integer('branch_id').unsigned().notNullable();
    table.enum('status', ['ACTIVE', 'INACTIVE']).defaultTo('ACTIVE');
    table.text('notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    table.integer('deleted_by').unsigned().nullable();
    table.integer('created_by').unsigned().nullable();
    table.integer('updated_by').unsigned().nullable();
    table.foreign('user_id').references('id').inTable('users');
    table.foreign('branch_id').references('id').inTable('branches');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('teachers');
};