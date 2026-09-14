// FILE: database/seeds/06_guardians.seed.js
exports.seed = async function(knex) {
  await knex('guardians')
    .insert([
      {
        code: 'GU-2026-000001',
        first_name: 'Luis',
        last_name: 'Pérez',
        relationship: 'Padre',
        phone: '+1-555-3001',
        email: 'luis.perez@email.com',
        address: 'Calle Principal 123',
        is_emergency_contact: true,
        is_primary: true,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      },
      {
        code: 'GU-2026-000002',
        first_name: 'Ana',
        last_name: 'Pérez',
        relationship: 'Madre',
        phone: '+1-555-3002',
        email: 'ana.perez@email.com',
        address: 'Calle Principal 123',
        is_emergency_contact: true,
        is_primary: false,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      },
      {
        code: 'GU-2026-000003',
        first_name: 'Carlos',
        last_name: 'López',
        relationship: 'Padre',
        phone: '+1-555-3003',
        email: 'carlos.lopez@email.com',
        address: 'Avenida Norte 456',
        is_emergency_contact: true,
        is_primary: true,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      }
    ])
    .onConflict('code')
    .merge(['first_name', 'last_name', 'relationship', 'phone', 'email', 'address', 'is_emergency_contact', 'is_primary', 'updated_at']);

  await knex('student_guardians')
    .insert([
      { student_id: 1, guardian_id: 1, is_primary: true, is_emergency_contact: true, created_at: knex.fn.now(), updated_at: knex.fn.now() },
      { student_id: 1, guardian_id: 2, is_primary: false, is_emergency_contact: true, created_at: knex.fn.now(), updated_at: knex.fn.now() },
      { student_id: 2, guardian_id: 3, is_primary: true, is_emergency_contact: true, created_at: knex.fn.now(), updated_at: knex.fn.now() }
    ])
    .onConflict(['student_id', 'guardian_id'])
    .merge(['is_primary', 'is_emergency_contact', 'updated_at']);
};