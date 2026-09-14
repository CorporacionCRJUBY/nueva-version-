// FILE: database/migrations/011_create_guardians.js
exports.up = function(knex) {
  return knex.schema.createTable('guardians', (table) => {
    table.increments('id').primary();
    table.string('code', 20).notNullable().unique();
    table.string('first_name', 50).notNullable();
    table.string('last_name', 50).notNullable();
    table.string('relationship', 50).notNullable();
    table.string('identification', 50).nullable();
    table.string('phone', 20);
    table.string('secondary_phone', 20).nullable();
    table.string('email', 100);
    table.string('address', 255);
    table.boolean('is_emergency_contact').defaultTo(false);
    table.boolean('is_primary').defaultTo(false);
    table.boolean('authorized_pickup').defaultTo(false);
    table.enum('status', ['ACTIVE', 'INACTIVE']).defaultTo('ACTIVE');
    table.text('notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    table.integer('deleted_by').unsigned().nullable();
    table.integer('created_by').unsigned().nullable();
    table.integer('updated_by').unsigned().nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('guardians');
};