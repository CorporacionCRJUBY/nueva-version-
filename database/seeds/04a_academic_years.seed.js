// FILE: database/seeds/04a_academic_years.seed.js
exports.seed = async function(knex) {
  await knex('academic_years')
    .insert([
      {
        code: 'YEA-2026-000001',
        name: '2026-2027',
        start_date: '2026-08-01',
        end_date: '2027-06-30',
        status: 'ACTIVE',
        is_active: true,
      },
    ])
    .onConflict('code')
    .merge(['name', 'start_date', 'end_date', 'status', 'is_active', 'updated_at']);
};