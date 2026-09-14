// FILE: database/seeds/01_branches.seed.js
// Idempotente: upsert (INSERT ... ON DUPLICATE KEY UPDATE) en lugar de
// borrar y reinsertar, para poder re-ejecutarse sin romper las FKs
// (branches es referenciada por users, students, teachers, ...) ni perder
// filas creadas fuera del seed.
exports.seed = function(knex) {
  const rows = [
    {
      code: 'BR-2026-000001',
      name: 'Main Campus',
      address: 'Av. Principal 123, Ciudad',
      phone: '+1-555-0100',
      email: 'principal@academix.com',
      status: 'ACTIVE',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      code: 'BR-2026-000002',
      name: 'North Campus',
      address: 'Calle Norte 456, Ciudad',
      phone: '+1-555-0101',
      email: 'norte@academix.com',
      status: 'ACTIVE',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }
  ];
  return knex('branches')
    .insert(rows)
    .onConflict('code')
    .merge(['name', 'address', 'phone', 'email', 'status', 'updated_at']);
};