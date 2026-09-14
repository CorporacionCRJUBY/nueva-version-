// FILE: database/seeds/05_students.seed.js
exports.seed = function(knex) {
  return knex('students')
    .insert([
      {
        code: 'STU-2026-000001',
        user_id: null,
        first_name: 'Juan',
        last_name: 'Pérez',
        email: 'juan.perez@student.com',
        phone: '+1-555-2001',
        address: 'Calle Principal 123',
        date_of_birth: '2012-05-15',
        gender: 'M',
        grade: '6th Grade',
        section: 'A',
        branch_id: 1,
        academic_year_id: 1,
        enrollment_date: '2025-02-01',
        graduation_year: 2027,
        status: 'ACTIVE',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      },
      {
        code: 'STU-2026-000002',
        user_id: null,
        first_name: 'María',
        last_name: 'López',
        email: 'maria.lopez@student.com',
        phone: '+1-555-2002',
        address: 'Avenida Norte 456',
        date_of_birth: '2012-08-20',
        gender: 'F',
        grade: '6th Grade',
        section: 'A',
        branch_id: 1,
        academic_year_id: 1,
        enrollment_date: '2025-02-01',
        graduation_year: 2027,
        status: 'ACTIVE',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      },
      {
        code: 'STU-2026-000003',
        user_id: null,
        first_name: 'Pedro',
        last_name: 'Sánchez',
        email: 'pedro.sanchez@student.com',
        phone: '+1-555-2003',
        address: 'Calle Sur 789',
        date_of_birth: '2012-11-10',
        gender: 'M',
        grade: '6th Grade',
        section: 'B',
        branch_id: 1,
        academic_year_id: 1,
        enrollment_date: '2025-02-01',
        graduation_year: 2027,
        status: 'ACTIVE',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      }
    ])
    .onConflict('code')
    .merge(['user_id', 'first_name', 'last_name', 'email', 'phone', 'address', 'date_of_birth', 'gender', 'grade', 'section', 'branch_id', 'academic_year_id', 'enrollment_date', 'graduation_year', 'status', 'updated_at']);
};