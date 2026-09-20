// FILE: database/seeds/08_attendance.seed.js
exports.seed = function(knex) {
  const records = [];
  const students = [1, 2, 3];
  const assignments = [1, 2, 3];
  const statuses = ['P', 'O', 'E', 'U'];
  const startDate = new Date('2025-02-03');

  for (let d = 0; d < 5; d++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().split('T')[0];

    for (const studentId of students) {
      for (const assignmentId of assignments) {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        records.push({
          code: `AT-${dateStr}-${studentId}-${assignmentId}`,
          assignment_id: assignmentId,
          student_id: studentId,
          date: dateStr,
          status: status,
          check_in_time: status === 'P' || status === 'O' ? '08:00:00' : null,
          check_out_time: status === 'P' || status === 'O' ? '14:00:00' : null,
          created_at: knex.fn.now(),
          updated_at: knex.fn.now()
        });
      }
    }
  }

  // Upsert: los códigos son deterministas, así que re-ejecutar el seed
  // refresca las mismas filas sin duplicar ni romper la unicidad.
  return knex('attendance_records')
    .insert(records)
    .onConflict('code')
    .merge(['assignment_id', 'student_id', 'date', 'status', 'check_in_time', 'check_out_time', 'updated_at']);
};