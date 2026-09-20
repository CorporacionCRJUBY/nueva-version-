// FILE: database/seeds/04b_academic_periods.seed.js
exports.seed = async function(knex) {
  await knex('academic_periods')
    .insert([
      { code: 'PER-2026-000001', academic_year_id: 1, name: 'Q1', start_date: '2026-08-01', end_date: '2026-10-15', status: 'OPEN' },
      { code: 'PER-2026-000002', academic_year_id: 1, name: 'Q2', start_date: '2026-10-16', end_date: '2026-12-20', status: 'OPEN' },
      { code: 'PER-2026-000003', academic_year_id: 1, name: 'Q3', start_date: '2027-01-08', end_date: '2027-03-15', status: 'OPEN' },
      { code: 'PER-2026-000004', academic_year_id: 1, name: 'Q4', start_date: '2027-03-16', end_date: '2027-06-30', status: 'OPEN' },
    ])
    .onConflict('code')
    .merge(['academic_year_id', 'name', 'start_date', 'end_date', 'status', 'updated_at']);
};