// FILE: database/seeds/03_users.seed.js
// Nota: este archivo vive fuera de backend/, por lo que no puede resolver
// paquetes npm como 'bcryptjs' (node_modules solo existe dentro de backend/).
// Como la contraseña del seed es fija ('Academix2026!'), se usa su hash bcrypt
// pre-calculado para no depender de esa dependencia externa. La contraseña
// cumple la política de contraseñas (>=10 caracteres, mayúscula, minúscula,
// dígito y símbolo).
const hashedPassword = '$2b$10$Fgk4B9YpgqybWSFx4VNtDeRCJ6C1Ii5OkpjWXSVsMhzo1SSDcwn8.'; // Academix2026!
exports.seed = async function(knex) {
  // SEGURIDAD (alto A4): estas cuentas son de DEMO con contraseña conocida.
  // Nunca deben sembrarse en producción salvo opt-in explícito.
  if (process.env.NODE_ENV === 'production' && process.env.SEED_ALLOW_IN_PRODUCTION !== 'true') {
    return Promise.reject(new Error(
      'Seed de usuarios demo bloqueado en producción. ' +
      'Si realmente lo necesita, defina SEED_ALLOW_IN_PRODUCTION=true.'
    ));
  }

  // Idempotente: upsert en vez de DELETE (users es referenciada por
  // teachers.user_id, students.user_id, audit_logs, activity_logs, ...).
  await knex('users')
    .insert([
      {
        code: 'USR-2026-000001',
        email: 'admin@academix.com',
        password: hashedPassword,
        full_name: 'Super Administrator',
        phone: '+1-555-0001',
        role_id: 1,
        branch_id: 1,
        status: 'ACTIVE',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      },
      {
        code: 'USR-2026-000002',
        email: 'admin2@academix.com',
        password: hashedPassword,
        full_name: 'General Administrator',
        phone: '+1-555-0002',
        role_id: 2,
        branch_id: 1,
        status: 'ACTIVE',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      },
      {
        // Cuenta de docente con login real. Se vincula a la fila de
        // `teachers` "María González" (ver 04_teachers.seed.js) a través
        // de `teachers.user_id`, ya que antes ningún profesor sembrado
        // tenía usuario asociado y era imposible probar el rol TEACHER.
        code: 'USR-2026-000003',
        email: 'maria.gonzalez@academix.com',
        password: hashedPassword,
        full_name: 'Maria Gonzalez',
        phone: '+1-555-1001',
        role_id: 3,
        branch_id: 1,
        status: 'ACTIVE',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      }
    ])
    .onConflict('code')
    .merge(['email', 'password', 'full_name', 'phone', 'role_id', 'branch_id', 'status', 'updated_at']);

  await knex('user_roles')
    .insert([
      { user_id: 1, role_id: 1, created_at: knex.fn.now(), updated_at: knex.fn.now() },
      { user_id: 2, role_id: 2, created_at: knex.fn.now(), updated_at: knex.fn.now() },
      { user_id: 3, role_id: 3, created_at: knex.fn.now(), updated_at: knex.fn.now() }
    ])
    .onConflict(['user_id', 'role_id'])
    .merge(['updated_at']);
};