// FILE: database/migrations/048_alter_existing_tables.js
exports.up = async function(knex) {
  // 1. Alter students table
  const hasStudentsMiddleName = await knex.schema.hasColumn('students', 'middle_name');
  if (!hasStudentsMiddleName) {
    await knex.schema.alterTable('students', (table) => {
      table.string('middle_name', 50).nullable();
      table.string('second_last_name', 50).nullable();
      table.string('identification_type', 20).nullable();
      table.string('identification_number', 50).nullable();
      table.string('photo_url', 255).nullable();
    });
  }

  // 2. Alter teachers table
  const hasTeachersMiddleName = await knex.schema.hasColumn('teachers', 'middle_name');
  if (!hasTeachersMiddleName) {
    await knex.schema.alterTable('teachers', (table) => {
      table.string('middle_name', 50).nullable();
      table.string('identification_number', 50).nullable();
      table.string('photo_url', 255).nullable();
    });
  }

  // 3. Alter guardians table
  const hasGuardiansFirstName = await knex.schema.hasColumn('guardians', 'first_name');
  if (!hasGuardiansFirstName) {
    await knex.schema.alterTable('guardians', (table) => {
      table.string('first_name', 50).nullable();
      table.string('last_name', 50).nullable();
      table.string('identification', 50).nullable();
      table.string('secondary_phone', 20).nullable();
      table.boolean('authorized_pickup').defaultTo(false);
      table.enum('status', ['ACTIVE', 'INACTIVE']).defaultTo('ACTIVE');
    });
  }
};

exports.down = async function(knex) {
};
