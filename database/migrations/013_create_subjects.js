// FILE: database/migrations/013_create_subjects.js
exports.up = function(knex) {
  return knex.schema.createTable('subjects', (table) => {
    table.increments('id').primary();
    table.string('code', 20).notNullable().unique();
    table.string('name', 100).notNullable();
    table.text('description');
    table.string('grade', 20);
    table.integer('branch_id').unsigned().notNullable();
    table.decimal('credits', 5, 2).defaultTo(0);
    table.integer('hours_per_week').defaultTo(0);
    table.enum('status', ['ACTIVE', 'INACTIVE']).defaultTo('ACTIVE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    table.integer('deleted_by').unsigned().nullable();
    table.integer('created_by').unsigned().nullable();
    table.integer('updated_by').unsigned().nullable();
    table.foreign('branch_id').references('id').inTable('branches');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('subjects');
};