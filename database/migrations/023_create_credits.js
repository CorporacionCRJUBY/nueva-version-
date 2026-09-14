// FILE: database/migrations/023_create_credits.js
exports.up = function(knex) {
  return knex.schema.createTable('credits', (table) => {
    table.increments('id').primary();
    table.string('code', 20).notNullable().unique();
    table.integer('student_id').unsigned().notNullable();
    table.integer('academic_period_id').unsigned().notNullable();
    table.enum('credit_type', ['ACADEMIC', 'SOCIAL', 'COMMUNITY', 'ELECTIVE']).notNullable();
    table.decimal('credits_earned', 5, 2).defaultTo(0);
    table.decimal('credits_required', 5, 2).defaultTo(0);
    table.enum('status', ['PENDING', 'APPROVED', 'REJECTED']).defaultTo('PENDING');
    table.text('notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    table.integer('deleted_by').unsigned().nullable();
    table.integer('created_by').unsigned().nullable();
    table.integer('updated_by').unsigned().nullable();
    table.foreign('student_id').references('id').inTable('students');
    table.foreign('academic_period_id').references('id').inTable('academic_periods');
    table.unique(['student_id', 'academic_period_id', 'credit_type']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('credits');
};