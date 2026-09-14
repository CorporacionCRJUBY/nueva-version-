// FILE: database/migrations/008_create_students.js
exports.up = function(knex) {
  return knex.schema.createTable('students', (table) => {
    table.increments('id').primary();
    table.string('code', 20).notNullable().unique();
    table.integer('user_id').unsigned().nullable();
    table.string('first_name', 50).notNullable();
    table.string('middle_name', 50).nullable();
    table.string('last_name', 50).notNullable();
    table.string('second_last_name', 50).nullable();
    table.string('identification_type', 20).nullable();
    table.string('identification_number', 50).nullable();
    table.string('photo_url', 255).nullable();
    table.string('email', 100).notNullable().unique();
    table.string('phone', 20);
    table.string('address', 255);
    table.date('date_of_birth').notNullable();
    table.enum('gender', ['M', 'F', 'OTHER']);
    table.string('grade', 20).notNullable();
    table.string('section', 20);
    table.integer('branch_id').unsigned().notNullable();
    table.integer('academic_year_id').unsigned().notNullable();
    table.date('enrollment_date').notNullable();
    table.integer('graduation_year');
    table.enum('status', ['ACTIVE', 'INACTIVE', 'GRADUATED', 'WITHDRAWN', 'TRANSFERRED', 'SUSPENDED']).defaultTo('ACTIVE');
    table.text('notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    table.integer('deleted_by').unsigned().nullable();
    table.integer('created_by').unsigned().nullable();
    table.integer('updated_by').unsigned().nullable();
    table.foreign('user_id').references('id').inTable('users');
    table.foreign('branch_id').references('id').inTable('branches');
    table.foreign('academic_year_id').references('id').inTable('academic_years');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('students');
};