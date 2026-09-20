// FILE: database/migrations/028_create_scholarships.js
exports.up = function(knex) {
  return knex.schema.createTable('scholarships', (table) => {
    table.increments('id').primary();
    table.string('code', 20).notNullable().unique();
    table.integer('student_id').unsigned().notNullable();
    table.string('scholarship_type', 50).notNullable();
    table.decimal('percentage', 5, 2);
    table.decimal('amount', 10, 2);
    table.integer('academic_year_id').unsigned().notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.enum('status', ['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED']).defaultTo('REQUESTED');
    table.date('approval_date').nullable();
    table.text('rejection_reason');
    table.text('notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    table.integer('deleted_by').unsigned().nullable();
    table.integer('created_by').unsigned().nullable();
    table.integer('updated_by').unsigned().nullable();
    table.foreign('student_id').references('id').inTable('students');
    table.foreign('academic_year_id').references('id').inTable('academic_years');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('scholarships');
};