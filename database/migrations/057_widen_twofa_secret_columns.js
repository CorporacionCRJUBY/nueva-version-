// FILE: database/migrations/057_widen_twofa_secret_columns.js
exports.up = async function(knex) {
  // Los secretos TOTP se guardan cifrados en reposo (AES-256-GCM, formato
  // enc:v1:<iv>:<authTag>:<ciphertext>), que no cabe en el VARCHAR(64)
  // original de la migración 054.
  for (const column of ['twofa_secret', 'twofa_pending_secret']) {
    const [rows] = await knex.raw(
      "SELECT character_maximum_length AS w FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = ?",
      [column]
    );
    if (rows.length > 0 && Number(rows[0].w) < 255) {
      await knex.schema.alterTable('users', (table) => {
        table.string(column, 255).alter();
      });
    }
  }
};

exports.down = async function(knex) {};