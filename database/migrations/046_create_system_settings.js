// FILE: database/migrations/046_create_system_settings.js
exports.up = function(knex) {
  return knex.schema.createTable('system_settings', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().nullable();
    table.string('setting_key', 50).notNullable();
    table.text('setting_value');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.unique(['user_id', 'setting_key']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('system_settings');
};