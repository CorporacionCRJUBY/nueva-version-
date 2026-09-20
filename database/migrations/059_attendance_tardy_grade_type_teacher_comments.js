// FILE: database/migrations/059_attendance_tardy_grade_type_teacher_comments.js
exports.up = async function(knex) {
  // Asistencia: nuevo estado T (Tardy / llegada tarde).
  const [attRows] = await knex.raw('SHOW COLUMNS FROM attendance_records LIKE ?', ['status']);
  if (attRows.length > 0 && !attRows[0].Type.includes("'T'")) {
    await knex.schema.alterTable('attendance_records', (table) => {
      table.enum('status', ['P', 'O', 'E', 'U', 'T']).notNullable().alter();
    });
  }

  // Calificaciones: tipo de nota y comentarios del docente.
  const hasGradeType = await knex.schema.hasColumn('grade_records', 'grade_type');
  if (!hasGradeType) {
    await knex.schema.alterTable('grade_records', (table) => {
      table.enum('grade_type', ['PR', 'RC']).notNullable().defaultTo('RC');
    });
  }

  const hasTeacherComments = await knex.schema.hasColumn('grade_records', 'teacher_comments');
  if (!hasTeacherComments) {
    await knex.schema.alterTable('grade_records', (table) => {
      table.text('teacher_comments').nullable();
    });
  }
};

exports.down = async function(knex) {};