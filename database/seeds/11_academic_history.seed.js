// FILE: database/seeds/11_academic_history.seed.js
exports.seed = function(knex) {
  const history = [];
  const students = [1, 2, 3];
  const subjects = [1, 2, 3];
  const periods = [1];
  const years = [1];

  for (const studentId of students) {
    for (const subjectId of subjects) {
      const gradeValue = 65 + Math.random() * 35;
      const gradeLetter = gradeValue >= 90 ? 'A' : gradeValue >= 80 ? 'B' : gradeValue >= 70 ? 'C' : gradeValue >= 60 ? 'D' : 'F';

      history.push({
        code: `AH-2026-${String(studentId).padStart(3,'0')}${String(subjectId).padStart(3,'0')}`,
        student_id: studentId,
        academic_period_id: periods[0],
        academic_year_id: years[0],
        subject_id: subjectId,
        grade_value: Math.round(gradeValue * 100) / 100,
        grade_letter: gradeLetter,
        status: 'PUBLISHED',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      });
    }
  }

  // Upsert por código determinista; la unicidad de filas activas
  // (student, period, subject, active_guard) también impide duplicados.
  return knex('academic_history')
    .insert(history)
    .onConflict('code')
    .merge(['student_id', 'academic_period_id', 'academic_year_id', 'subject_id', 'grade_value', 'grade_letter', 'status', 'updated_at']);
};