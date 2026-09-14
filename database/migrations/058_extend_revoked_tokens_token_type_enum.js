// FILE: database/migrations/058_extend_revoked_tokens_token_type_enum.js
exports.up = async function(knex) {
  // Los challenges 2FA de un solo uso se canjean insertando su jti aquí;
  // el enum debe admitir el nuevo tipo.
  const [rows] = await knex.raw('SHOW COLUMNS FROM revoked_tokens LIKE ?', ['token_type']);
  if (rows.length > 0 && !rows[0].Type.includes('2fa_challenge')) {
    await knex.schema.alterTable('revoked_tokens', (table) => {
      table.enum('token_type', ['access', 'refresh', '2fa_challenge']).notNullable().alter();
    });
  }
};

exports.down = async function(knex) {};