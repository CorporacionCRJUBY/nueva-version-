// FILE: database/seeds/10_scholarships.seed.js
exports.seed = function(knex) {
  return knex('scholarships')
    .insert([
      {
        code: 'SCH-2026-000001',
        student_id: 1,
        scholarship_type: 'Académica',
        percentage: 50.00,
        amount: 0,
        academic_year_id: 1,
        start_date: '2025-02-01',
        end_date: '2025-12-31',
        status: 'ACTIVE',
        approval_date: '2025-02-15',
        notes: 'Beca por excelencia académica',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      },
      {
        code: 'SCH-2026-000002',
        student_id: 2,
        scholarship_type: 'Deportiva',
        percentage: 30.00,
        amount: 0,
        academic_year_id: 1,
        start_date: '2025-02-01',
        end_date: '2025-12-31',
        status: 'ACTIVE',
        approval_date: '2025-02-20',
        notes: 'Beca por rendimiento deportivo',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      }
    ])
    .onConflict('code')
    .merge(['student_id', 'scholarship_type', 'percentage', 'amount', 'academic_year_id', 'start_date', 'end_date', 'status', 'approval_date', 'notes', 'updated_at']);
};