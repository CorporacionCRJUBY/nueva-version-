// FILE: database/migrations/012_create_student_guardians.js
exports.up = function(knex) {
  return knex.schema.createTable('student_guardians', (table) => {
    table.increments('id').primary();
    table.integer('student_id').unsigned().notNullable();
    table.integer('guardian_id').unsigned().notNullable();
    table.boolean('is_primary').defaultTo(false);
    table.boolean('is_emergency_contact').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.foreign('student_id').references('id').inTable('students').onDelete('CASCADE');
    table.foreign('guardian_id').references('id').inTable('guardians').onDelete('CASCADE');
    table.unique(['student_id', 'guardian_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('student_guardians');
};