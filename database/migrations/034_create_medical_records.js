// FILE: database/migrations/034_create_medical_records.js
exports.up = function(knex) {
  return knex.schema.createTable('medical_records', (table) => {
    table.increments('id').primary();
    table.string('code', 20).notNullable().unique();
    table.integer('student_id').unsigned().notNullable();
    table.text('medical_condition');
    table.text('allergies');
    table.text('medications');
    table.string('emergency_contact_name', 100);
    table.string('emergency_contact_phone', 20);
    table.string('health_insurance', 100);
    table.string('insurance_number', 50);
    table.text('notes');
    table.date('last_checkup_date').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    table.integer('deleted_by').unsigned().nullable();
    table.integer('created_by').unsigned().nullable();
    table.integer('updated_by').unsigned().nullable();
    table.foreign('student_id').references('id').inTable('students').onDelete('CASCADE');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('medical_records');
};