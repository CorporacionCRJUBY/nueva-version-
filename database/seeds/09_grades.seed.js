// FILE: database/seeds/09_grades.seed.js
exports.seed = function(knex) {
  const grades = [];
  const students = [1, 2, 3];
  const subjects = [1, 2, 3];
  const assignments = [1, 2, 3];
  const statuses = ['PUBLISHED', 'LOCKED'];
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 30);

  for (const studentId of students) {
    for (const subjectId of subjects) {
      const gradeValue = 60 + Math.random() * 40;
      const gradeLetter = gradeValue >= 90 ? 'A' : gradeValue >= 80 ? 'B' : gradeValue >= 70 ? 'C' : gradeValue >= 60 ? 'D' : 'F';
      const assignmentId = assignments[subjectId - 1];

      grades.push({
        code: `GR-2026-${String(studentId).padStart(3,'0')}${String(subjectId).padStart(3,'0')}`,
        student_id: studentId,
        subject_id: subjectId,
        assignment_id: assignmentId,
        academic_period_id: 1,
        grade_value: Math.round(gradeValue * 100) / 100,
        grade_letter: gradeLetter,
        weight: 1.0,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        edit_deadline: deadline,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      });
    }
  }

  // Upsert por código determinista; la unicidad compuesta
  // (student, subject, assignment, period, grade_type, active_guard)
  // también impide duplicados al re-ejecutar.
  return knex('grade_records')
    .insert(grades)
    .onConflict('code')
    .merge(['student_id', 'subject_id', 'assignment_id', 'academic_period_id', 'grade_value', 'grade_letter', 'weight', 'status', 'edit_deadline', 'updated_at']);
};