// FILE: database/seeds/07_subjects_assignments.seed.js
exports.seed = async function(knex) {
  await knex('subjects')
    .insert([
      {
        code: 'SUB-2026-000001',
        name: 'Mathematics',
        description: 'Curso de matemáticas básicas',
        grade: '6th Grade',
        branch_id: 1,
        credits: 4.00,
        hours_per_week: 5,
        status: 'ACTIVE',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      },
      {
        code: 'SUB-2026-000002',
        name: 'Natural Sciences',
        description: 'Curso de ciencias naturales',
        grade: '6th Grade',
        branch_id: 1,
        credits: 3.00,
        hours_per_week: 4,
        status: 'ACTIVE',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      },
      {
        code: 'SUB-2026-000003',
        name: 'Language Arts',
        description: 'Curso de lengua y literatura',
        grade: '6th Grade',
        branch_id: 1,
        credits: 3.00,
        hours_per_week: 4,
        status: 'ACTIVE',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      }
    ])
    .onConflict('code')
    .merge(['name', 'description', 'grade', 'branch_id', 'credits', 'hours_per_week', 'status', 'updated_at']);

  await knex('academic_assignments')
    .insert([
      {
        code: 'AS-2026-000001',
        teacher_id: 1,
        subject_id: 1,
        grade: '6th Grade',
        section: 'A',
        branch_id: 1,
        academic_year_id: 1,
        schedule: 'Lunes y Miércoles 8:00-10:00',
        status: 'ACTIVE',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      },
      {
        code: 'AS-2026-000002',
        teacher_id: 2,
        subject_id: 2,
        grade: '6th Grade',
        section: 'A',
        branch_id: 1,
        academic_year_id: 1,
        schedule: 'Martes y Jueves 8:00-10:00',
        status: 'ACTIVE',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      },
      {
        code: 'AS-2026-000003',
        teacher_id: 3,
        subject_id: 3,
        grade: '6th Grade',
        section: 'A',
        branch_id: 1,
        academic_year_id: 1,
        schedule: 'Lunes y Miércoles 10:00-12:00',
        status: 'ACTIVE',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      }
    ])
    .onConflict('code')
    .merge(['teacher_id', 'subject_id', 'grade', 'section', 'branch_id', 'academic_year_id', 'schedule', 'status', 'updated_at']);
};