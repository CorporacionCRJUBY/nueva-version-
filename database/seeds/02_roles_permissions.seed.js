// FILE: database/seeds/02_roles_permissions.seed.js
//
// FIX (auditoria hallazgos #1 y #2):
//  - El catálogo de `permissions` ahora cubre los 30 módulos reales que las
//    rutas exigen vía authorize('modulo.accion') (antes solo cubría 9).
//  - ADMIN y TEACHER reciben filas reales en `role_permissions` (antes 0 y 0).
//    Antes, solo SUPER_ADMIN tenía permisos y las otras dos cuentas demo
//    (admin2@academix.com, maria.gonzalez@academix.com) podían iniciar
//    sesión pero no podían usar ningún endpoint protegido.
//
// Idempotente: upsert (INSERT ... ON DUPLICATE KEY UPDATE) en vez de
// borrar y reinsertar. roles es referenciada por users/user_roles, así que
// el DELETE original rompía las FKs al re-ejecutar el seed sobre una base
// ya sembrada.
exports.seed = async function(knex) {
  // Insertar roles
  await knex('roles')
    .insert([
      {
        code: 'ROLE-2026-000001',
        name: 'SUPER_ADMIN',
        description: 'Super Administrator - full system access',
        status: 'ACTIVE',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      },
      {
        code: 'ROLE-2026-000002',
        name: 'ADMIN',
        description: 'Administrator - academic and administrative management',
        status: 'ACTIVE',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      },
      {
        code: 'ROLE-2026-000003',
        name: 'TEACHER',
        description: 'Teacher - class and grade management',
        status: 'ACTIVE',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      }
    ])
    .onConflict('code')
    .merge(['name', 'description', 'status', 'updated_at']);

  // Insertar permisos: un módulo.accion por cada authorize() usado en
  // src/routes/*.js. Mantener esta lista sincronizada con las rutas.
  const modules = {
    'academic-history':      ['view', 'create', 'edit', 'delete'],
    'academic-periods':      ['view', 'create', 'edit', 'delete'],
    'academic-years':        ['view', 'create', 'edit', 'delete'],
    'activity':              ['view'],
    'assignments':           ['view', 'create', 'edit', 'delete'],
    'attendance':            ['view', 'create', 'edit', 'delete'],
    'audit':                 ['view'],
    'branches':              ['view', 'create', 'edit', 'delete'],
    'calendar':              ['view', 'create', 'edit', 'delete'],
    'credits':               ['view', 'create', 'edit', 'delete'],
    'documents':             ['view', 'create', 'edit', 'delete'],
    'gpa':                   ['view', 'create', 'edit', 'delete'],
    'grade-change-requests': ['view', 'create', 'edit', 'delete', 'approve', 'reject'],
    'grades':                ['view', 'create', 'edit', 'delete', 'request_change'],
    'graduation':            ['view', 'create', 'edit', 'delete', 'validate'],
    'gransif':               ['view', 'create', 'edit', 'delete'],
    'guardians':             ['view', 'create', 'edit', 'delete'],
    'medical-records':       ['view', 'create', 'edit', 'delete'],
    'permissions':           ['view', 'create', 'edit', 'delete'],
    'previous-schools':      ['view', 'create', 'edit', 'delete'],
    'progress-reports':      ['view', 'create', 'edit', 'delete', 'generate'],
    'report-cards':          ['view', 'create', 'edit', 'delete', 'generate'],
    'reports':               ['view'],
    'roles':                 ['view', 'create', 'edit', 'delete'],
    'scholarships':          ['view', 'create', 'edit', 'delete'],
    'settings':              ['view', 'edit'],
    'students':              ['view', 'create', 'edit', 'delete'],
    'subjects':              ['view', 'create', 'edit', 'delete'],
    'teachers':              ['view', 'create', 'edit', 'delete'],
    'transcripts':           ['view', 'create', 'edit', 'delete', 'generate'],
    'users':                 ['view', 'create', 'edit', 'delete'],
    'system':                ['view', 'manage']
  };

  const descriptions = {
    view: 'Ver', create: 'Crear', edit: 'Editar', delete: 'Eliminar',
    generate: 'Generar', approve: 'Aprobar', reject: 'Rechazar',
    validate: 'Validar', request_change: 'Solicitar cambio de'
  };

  let counter = 1;
  const permissions = [];
  Object.keys(modules).forEach(module => {
    modules[module].forEach(action => {
      permissions.push({
        code: `PERM-2026-${String(counter).padStart(6, '0')}`,
        module,
        action,
        description: `${descriptions[action] || action} ${module}`
      });
      counter += 1;
    });
  });

  await knex('permissions')
    .insert(permissions)
    .onConflict('code')
    .merge(['module', 'action', 'description', 'updated_at']);

  const roles = await knex('roles').select('id', 'name');
  const superAdminRole = roles.find(r => r.name === 'SUPER_ADMIN');
  const adminRole = roles.find(r => r.name === 'ADMIN');
  const teacherRole = roles.find(r => r.name === 'TEACHER');

  // ADMIN: todo el sistema excepto administración de roles/permisos
  // (delegado a SUPER_ADMIN) y baja de usuarios (para evitar que un
  // ADMIN se elimine a sí mismo o a otros administradores).
  // FIX (bitácora 2026-09-16, "asignación de permisos/roles no funciona"):
  // roles.view y permissions.view quedan afuera de la exclusión. Sin ellos,
  // ADMIN no podía ni abrir /roles/:id/permissions (ProtectedRoute exige
  // roles.view solo para ENTRAR a la pantalla, redirige a /forbidden) ni
  // cargar la lista de roles disponibles al asignar roles a un usuario
  // (UserRolesPage llama GET /roles, que respondía 403). Administrar de
  // verdad el catálogo (crear/editar/borrar roles o permisos, y asignar
  // permisos a un rol) sigue reservado a SUPER_ADMIN.
  const adminExcluded = new Set([
    'roles.create', 'roles.edit', 'roles.delete',
    'permissions.create', 'permissions.edit', 'permissions.delete',
    'users.delete'
  ]);

  // TEACHER: lo que un docente necesita para pasar asistencia, cargar
  // notas y consultar la información de sus estudiantes/cursos.
  const teacherAllowed = new Set([
    'students.view', 'students.edit',
    'grades.view', 'grades.create', 'grades.edit', 'grades.request_change',
    'attendance.view', 'attendance.create', 'attendance.edit',
    'guardians.view',
    'medical-records.view',
    // FIX (bitácora 2026-09-16, "autoasignación de materias"): antes el
    // docente solo podía VER asignaciones ya creadas por un ADMIN. Ahora
    // busca su grupo (grado+sección) y se autoasigna la materia y el
    // horario que va a dar. create/edit/delete quedan restringidos a sus
    // propias asignaciones en assignments.service.js (assertOwnsAssignment);
    // el permiso por sí solo no le abre las asignaciones de otro docente.
    'assignments.view', 'assignments.create', 'assignments.edit', 'assignments.delete',
    'subjects.view',
    'academic-years.view', 'academic-periods.view',
    'calendar.view',
    'documents.view',
    'progress-reports.view', 'progress-reports.create',
    'report-cards.view',
    'transcripts.view',
    'grade-change-requests.view', 'grade-change-requests.create'
  ]);

  const perms = await knex('permissions').select('id', 'module', 'action');
  const rows = [];
  const now = knex.fn.now();

  perms.forEach(p => {
    const key = `${p.module}.${p.action}`;

    // SUPER_ADMIN: todos los permisos.
    rows.push({
      role_id: superAdminRole.id,
      permission_id: p.id,
      created_at: now,
      updated_at: now
    });

    // ADMIN: todos menos los excluidos.
    if (!adminExcluded.has(key)) {
      rows.push({
        role_id: adminRole.id,
        permission_id: p.id,
        created_at: now,
        updated_at: now
      });
    }

    // TEACHER: solo el subconjunto permitido.
    if (teacherAllowed.has(key)) {
      rows.push({
        role_id: teacherRole.id,
        permission_id: p.id,
        created_at: now,
        updated_at: now
      });
    }
  });

  await knex('role_permissions')
    .insert(rows)
    .onConflict(['role_id', 'permission_id'])
    .merge(['updated_at']);
};