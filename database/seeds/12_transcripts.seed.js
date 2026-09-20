// FILE: database/seeds/12_transcripts.seed.js
exports.seed = async function(knex) {
  await knex('transcripts')
    .insert([
      {
        code: 'TRN-2026-000001',
        student_id: 1,
        academic_period_id: 1,
        academic_year_id: 1,
        transcript_type: 'OFFICIAL',
        status: 'OFFICIAL',
        version_number: 1,
        generated_by: 1,
        approved_by: 1,
        approved_at: knex.fn.now(),
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      }
    ])
    .onConflict('code')
    .merge(['student_id', 'academic_period_id', 'academic_year_id', 'transcript_type', 'status', 'version_number', 'generated_by', 'approved_by', 'approved_at', 'updated_at']);

  // transcript_courses no tiene clave única natural, así que para refrescar
  // las filas sembradas se borran solo las del transcript del seed y se
  // reinsertan (nunca se tocan filas de otros transcripts).
  const seedTranscripts = await knex('transcripts').select('id').where('code', 'TRN-2026-000001');
  const seedIds = seedTranscripts.map((t) => t.id);
  if (seedIds.length > 0) {
    await knex('transcript_courses').whereIn('transcript_id', seedIds).del();
  }

  await knex('transcript_courses').insert([
    { transcript_id: seedIds[0], subject_id: 1, grade_value: 92.5, grade_letter: 'A', credits: 4.00, created_at: knex.fn.now() },
    { transcript_id: seedIds[0], subject_id: 2, grade_value: 85.0, grade_letter: 'B', credits: 3.00, created_at: knex.fn.now() },
    { transcript_id: seedIds[0], subject_id: 3, grade_value: 78.0, grade_letter: 'C', credits: 3.00, created_at: knex.fn.now() }
  ]);
};