// FILE: database/migrations/047_create_translations.js
exports.up = function(knex) {
  return knex.schema.createTable('translations', (table) => {
    table.increments('id').primary();
    table.string('locale', 5).notNullable();
    table.string('key', 100).notNullable();
    table.text('value').notNullable();
    table.string('namespace', 50).defaultTo('global');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['locale', 'key', 'namespace']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('translations');
};