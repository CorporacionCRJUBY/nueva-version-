// =============================================================================
// qa/api-sweep.mjs — Barrido exhaustivo de TODOS los endpoints de ACADEMIX 2.0
//
// Objetivo: encontrar errores REALES (500s, 404s inesperados, respuestas mal
// formadas) en cada módulo del backend, no "compila y arranca".
//
// Uso:  node qa/api-sweep.mjs [BASE_URL]
// Salida: qa/api-sweep-results.txt  (y resumen por consola)
// =============================================================================
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.argv[2] || 'http://localhost:5000';
const OUT = path.join(import.meta.dirname, 'api-sweep-results.txt');

const creds = {
  admin: { email: 'admin@academix.com', password: 'Academix2026!' },
  admin2: { email: 'admin2@academix.com', password: 'Academix2026!' },
  teacher: { email: 'maria.gonzalez@academix.com', password: 'Academix2026!' },
};

let pass = 0;
let fail = 0;
let warn = 0;
const failures = [];
let jar = '';

function log(line) {
  fs.appendFileSync(OUT, line + '\n');
}

function ok(desc, extra = '') {
  pass++;
  log(`  [PASS] ${desc}${extra ? ' — ' + extra : ''}`);
}

function bad(desc, detail) {
  fail++;
  failures.push({ desc, detail });
  log(`  [FAIL] ${desc}  ->  ${detail}`);
}

function note(desc) {
  warn++;
  log(`  [INFO] ${desc}`);
}

async function req(method, url, body, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (jar) headers.Cookie = jar;
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (opts.lang) headers['Accept-Language'] = opts.lang;

  const res = await fetch(`${BASE}${url}`, {
    method,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });

  const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  if (setCookie.length) {
    const map = new Map();
    for (const c of (jar ? jar.split('; ') : [])) {
      const [k, ...v] = c.split('=');
      if (k) map.set(k, v.join('='));
    }
    for (const c of setCookie) {
      const [pair] = c.split(';');
      const [k, ...v] = pair.split('=');
      if (k && v.join('=')) map.set(k, v.join('='));
      else if (k) map.delete(k);
    }
    jar = [...map.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* binario o no-JSON */ }
  return { status: res.status, json, text, headers: res.headers, contentType: res.headers.get('content-type') || '' };
}

/** Espera un código concreto y registra el resultado. */
async function expectOne(method, url, expected, desc, body, opts) {
  const r = await req(method, url, body, opts);
  const codes = String(expected).split(',').map((c) => Number(c.trim()));
  if (codes.includes(r.status)) {
    ok(`${method} ${url} -> ${r.status}${desc ? ` (${desc})` : ''}`);
  } else {
    const snippet = (r.text || '').slice(0, 180).replace(/\s+/g, ' ');
    bad(`${method} ${url}${desc ? ` (${desc})` : ''}`, `código ${r.status}, esperado [${codes.join(',')}] :: ${snippet}`);
  }
  return r;
}

// --- id helpers -------------------------------------------------------------
const ids = {};

(async () => {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, '');
  log('='.repeat(78));
  log(` ACADEMIX 2.0 — BARRIDO DE API (todos los módulos)`);
  log(` Base: ${BASE} · Fecha: ${new Date().toISOString()}`);
  log('='.repeat(78));

  // =========================================================================
  log('\n0. SALUD Y ARRANQUE');
  // =========================================================================
  await expectOne('GET', '/', '200', 'raíz');
  await expectOne('GET', '/health/live', '200', 'liveness');
  await expectOne('GET', '/health/ready', '200', 'readiness (BD)');

  // =========================================================================
  log('\n1. AUTENTICACIÓN');
  // =========================================================================
  await expectOne('POST', '/api/auth/login', '401', 'login con contraseña incorrecta', { email: creds.admin.email, password: 'wrong-password-123' });
  await expectOne('GET', '/api/auth/me', '401', 'me sin sesión');
  await expectOne('GET', '/api/students', '401', 'endpoint protegido sin sesión');

  const login = await req('POST', '/api/auth/login', creds.admin);
  if (login.status === 200) ok(`login admin -> 200`);
  else bad('login admin', `código ${login.status} :: ${(login.text || '').slice(0, 200)}`);

  await expectOne('GET', '/api/auth/me', '200', 'me con sesión');

  // =========================================================================
  log('\n2. RBAC — docente contra rutas de administrador');
  // =========================================================================
  {
    const savedJar = jar;
    jar = '';
    const tLogin = await req('POST', '/api/auth/login', creds.teacher);
    if (tLogin.status === 200) ok('login docente -> 200');
    else bad('login docente', `código ${tLogin.status} :: ${(tLogin.text || '').slice(0, 200)}`);
    const teacherJar = jar;
    jar = teacherJar;
    await expectOne('GET', '/api/users', '403', 'docente no puede listar usuarios');
    await expectOne('GET', '/api/roles', '403', 'docente no puede listar roles');
    await expectOne('DELETE', '/api/students/1', '403', 'docente no puede borrar estudiantes');
    jar = savedJar;
  }

  // =========================================================================
  log('\n3. LISTADOS DE TODOS LOS MÓDULOS (GET colección)');
  // =========================================================================
  const lists = [
    ['/api/users', 'users'],
    ['/api/students', 'students'],
    ['/api/teachers', 'teachers'],
    ['/api/subjects', 'subjects'],
    ['/api/branches', 'branches'],
    ['/api/academic-years', 'academic-years'],
    ['/api/academic-periods', 'academic-periods'],
    ['/api/academic-history', 'academic-history'],
    ['/api/assignments', 'assignments'],
    ['/api/attendance', 'attendance'],
    ['/api/grades', 'grades'],
    ['/api/grade-change-requests', 'grade-change-requests'],
    ['/api/gpa', 'gpa'],
    ['/api/credits', 'credits'],
    ['/api/scholarships', 'scholarships'],
    ['/api/guardians', 'guardians'],
    ['/api/medical-records', 'medical-records'],
    ['/api/previous-schools', 'previous-schools'],
    ['/api/documents', 'documents'],
    ['/api/calendar', 'calendar'],
    ['/api/graduation', 'graduation'],
    ['/api/gransif', 'gransif'],
    ['/api/progress-reports', 'progress-reports'],
    ['/api/report-cards', 'report-cards'],
    ['/api/transcripts', 'transcripts'],
    ['/api/reports', 'reports'],
    ['/api/audit', 'audit'],
    ['/api/activity', 'activity'],
    ['/api/roles', 'roles'],
    ['/api/permissions', 'permissions'],
    ['/api/settings', 'settings'],
    ['/api/system/metrics', 'system-metrics'],
    ['/api/system/services', 'system-services'],
    ['/api/system/logs', 'system-logs'],
  ];

  for (const [url, name] of lists) {
    const r = await req('GET', url);
    if (r.status === 200) {
      // Verificar forma de la respuesta
      const shape = r.json;
      const hasData = shape && (Array.isArray(shape.data) || Array.isArray(shape.items) || shape.data || shape.success !== undefined);
      ok(`GET ${url} -> 200`, `${(r.text || '').length} bytes${!hasData ? ' (forma inesperada)' : ''}`);
      if (!hasData) note(`  respuesta de ${name} sin estructura estándar: ${(r.text || '').slice(0, 120)}`);
    } else {
      bad(`GET ${url}`, `código ${r.status} :: ${(r.text || '').slice(0, 200).replace(/\s+/g, ' ')}`);
    }
  }

  // Recopilar IDs reales para las pruebas de detalle
  const getData = async (url) => {
    const r = await req('GET', url);
    if (r.status !== 200 || !r.json) return [];
    const d = r.json.data ?? r.json.items ?? r.json;
    if (Array.isArray(d)) return d;
    if (d && Array.isArray(d.items)) return d.items;
    if (d && Array.isArray(d.rows)) return d.rows;
    return [];
  };

  ids.student = (await getData('/api/students?limit=5'))[0]?.id;
  ids.teacher = (await getData('/api/teachers?limit=5'))[0]?.id;
  ids.user = (await getData('/api/users?limit=5'))[0]?.id;
  ids.subject = (await getData('/api/subjects?limit=5'))[0]?.id;
  ids.branch = (await getData('/api/branches?limit=5'))[0]?.id;
  ids.year = (await getData('/api/academic-years?limit=5'))[0]?.id;
  ids.role = (await getData('/api/roles?limit=5'))[0]?.id;
  ids.assignment = (await getData('/api/assignments?limit=5'))[0]?.id;
  ids.grade = (await getData('/api/grades?limit=5'))[0]?.id;
  ids.guardian = (await getData('/api/guardians?limit=5'))[0]?.id;
  ids.transcript = (await getData('/api/transcripts?limit=5'))[0]?.id;
  log(`\n  [INFO] IDs detectados: ${JSON.stringify(ids)}`);

  // =========================================================================
  log('\n4. DETALLE POR ID (GET /recurso/:id)');
  // =========================================================================
  const byId = [
    [ids.user, '/api/users'],
    [ids.student, '/api/students'],
    [ids.teacher, '/api/teachers'],
    [ids.subject, '/api/subjects'],
    [ids.branch, '/api/branches'],
    [ids.year, '/api/academic-years'],
    [ids.role, '/api/roles'],
  ];
  for (const [id, base] of byId) {
    if (!id) { note(`sin id para ${base} — se omite`); continue; }
    await expectOne('GET', `${base}/${id}`, '200,404', 'detalle');
  }

  // 404 limpio con id inexistente
  await expectOne('GET', '/api/students/99999999', '404', 'id inexistente -> 404 limpio');

  // =========================================================================
  log('\n5. CRUD REAL — crear, leer, actualizar, borrar');
  // =========================================================================

  // --- 5.1 Branches ---
  {
    const code = `QA-BR-${Date.now()}`;
    const c = await req('POST', '/api/branches', {
      code, name: `QA Branch ${Date.now()}`, city: 'QA City', state: 'QA', country: 'USA',
      is_active: true,
    });
    if (c.status === 201 || c.status === 200) {
      ok('POST /api/branches -> creado');
      const id = c.json?.data?.id ?? c.json?.id;
      if (id) {
        await expectOne('PUT', `/api/branches/${id}`, '200', 'actualizar', { name: `QA Branch Upd ${Date.now()}` });
        await expectOne('DELETE', `/api/branches/${id}`, '200,204', 'borrar');
      } else note('POST branches sin id en la respuesta');
    } else {
      bad('POST /api/branches', `código ${c.status} :: ${(c.text || '').slice(0, 250).replace(/\s+/g, ' ')}`);
    }
  }

  // --- 5.2 Subjects ---
  {
    const c = await req('POST', '/api/subjects', {
      name: `QA Subject ${Date.now()}`,
      description: 'QA subject created by the automated sweep',
      grade: '6to',
      branch_id: ids.branch,
      credits: 3,
      hours_per_week: 4,
      status: 'ACTIVE',
    });
    if (c.status === 201 || c.status === 200) {
      ok('POST /api/subjects -> creado');
      const id = c.json?.data?.id ?? c.json?.id;
      ids.qaSubject = id;
      if (id) {
        await expectOne('PUT', `/api/subjects/${id}`, '200', 'actualizar', { name: `QA Subject Upd ${Date.now()}` });
      }
    } else {
      bad('POST /api/subjects', `código ${c.status} :: ${(c.text || '').slice(0, 250).replace(/\s+/g, ' ')}`);
    }
  }

  // --- 5.3 Students (el módulo más importante) ---
  {
    const c = await req('POST', '/api/students', {
      first_name: 'QA',
      last_name: `Student${Date.now()}`,
      date_of_birth: '2010-05-15',
      gender: 'M',
      email: `qa.student.${Date.now()}@example.com`,
      phone: '+1-555-7777',
      address: '123 QA Street',
      grade: '6to',
      section: 'A',
      branch_id: ids.branch,
      academic_year_id: ids.year,
      enrollment_date: '2026-08-15',
      status: 'ACTIVE',
    });
    if (c.status === 201 || c.status === 200) {
      ok('POST /api/students -> creado');
      const id = c.json?.data?.id ?? c.json?.id;
      ids.qaStudent = id;
      if (id) {
        await expectOne('GET', `/api/students/${id}`, '200', 'leer creado');
        await expectOne('GET', `/api/students/${id}/record`, '200', 'expediente completo');
        await expectOne('PUT', `/api/students/${id}`, '200', 'actualizar', { first_name: 'QAUpdated' });
        await expectOne('POST', `/api/students/${id}/status`, '200', 'cambiar estado', { status: 'INACTIVE', reason: 'QA test' });
      }
    } else {
      bad('POST /api/students', `código ${c.status} :: ${(c.text || '').slice(0, 300).replace(/\s+/g, ' ')}`);
    }
  }

  // --- 5.4 Teachers ---
  {
    const code = `QA-TCH-${Date.now()}`;
    const c = await req('POST', '/api/teachers', {
      code,
      first_name: 'QA',
      last_name: `Teacher${Date.now()}`,
      email: `qa.teacher.${Date.now()}@example.com`,
      phone: '+1-555-9999',
      hire_date: '2026-08-01',
      branch_id: ids.branch,
      status: 'ACTIVE',
    });
    if (c.status === 201 || c.status === 200) ok('POST /api/teachers -> creado');
    else bad('POST /api/teachers', `código ${c.status} :: ${(c.text || '').slice(0, 300).replace(/\s+/g, ' ')}`);
  }

  // --- 5.5 Users ---
  {
    const email = `qa.user.${Date.now()}@example.com`;
    const c = await req('POST', '/api/users', {
      email, full_name: 'QA User', phone: '+1-555-8888',
      password: 'QaPassword2026!', role_id: ids.role, branch_id: ids.branch, status: 'ACTIVE',
    });
    if (c.status === 201 || c.status === 200) {
      ok('POST /api/users -> creado');
      const id = c.json?.data?.id ?? c.json?.id;
      if (id) {
        await expectOne('POST', `/api/users/${id}/change-password`, '200', 'cambiar contraseña', { currentPassword: 'QaPassword2026!', newPassword: 'QaPassword2026!!' });
      }
    } else {
      bad('POST /api/users', `código ${c.status} :: ${(c.text || '').slice(0, 300).replace(/\s+/g, ' ')}`);
    }
  }

  // --- 5.6 Academic Years / Periods ---
  {
    const c = await req('POST', '/api/academic-years', {
      name: `QA AY ${Date.now()}`, start_date: '2027-08-01', end_date: '2028-06-30', is_active: false,
    });
    if (c.status === 201 || c.status === 200) ok('POST /api/academic-years -> creado');
    else bad('POST /api/academic-years', `código ${c.status} :: ${(c.text || '').slice(0, 250).replace(/\s+/g, ' ')}`);
  }

  // --- 5.7 Calendar ---
  {
    const c = await req('POST', '/api/calendar', {
      date: '2026-12-01',
      title: `QA Event ${Date.now()}`,
      description: 'QA calendar event',
      event_type: 'HOLIDAY',
      branch_id: ids.branch,
      academic_year_id: ids.year,
      is_holiday: true,
      is_working_day: false,
      status: 'ACTIVE',
    });
    if (c.status === 201 || c.status === 200) {
      ok('POST /api/calendar -> creado');
      const id = c.json?.data?.id ?? c.json?.id;
      if (id) {
        await expectOne('PUT', `/api/calendar/${id}`, '200', 'actualizar evento', { title: `QA Event Upd ${Date.now()}` });
        await expectOne('DELETE', `/api/calendar/${id}`, '200,204', 'borrar evento');
      }
    } else {
      bad('POST /api/calendar', `código ${c.status} :: ${(c.text || '').slice(0, 250).replace(/\s+/g, ' ')}`);
    }
  }

  // --- 5.8 Validación: payload inválido debe dar 400/422, nunca 500 ---
  log('\n6. VALIDACIÓN Y ERRORES DE BASE DE DATOS');
  await expectOne('POST', '/api/students', '400,422', 'estudiante sin campos obligatorios', {});
  await expectOne('POST', '/api/users', '400,422', 'usuario sin email', { full_name: 'x' });
  await expectOne('POST', '/api/subjects', '400,422', 'materia vacía', {});
  await expectOne('POST', '/api/auth/login', '400,401,422', 'login sin body', {});

  // Duplicados: deben ser 409 (conflicto), nunca 500.
  {
    const email = `dup.${Date.now()}@example.com`;
    const first = await req('POST', '/api/users', {
      email, full_name: 'Dup User', password: 'QaPassword2026!', role_id: ids.role, branch_id: ids.branch,
    });
    if (first.status === 201 || first.status === 200) ok('primer usuario con email único -> creado');
    else bad('primer usuario único', `código ${first.status} :: ${(first.text || '').slice(0, 200)}`);

    const dup = await req('POST', '/api/users', {
      email, full_name: 'Dup User 2', password: 'QaPassword2026!', role_id: ids.role, branch_id: ids.branch,
    });
    if (dup.status === 409) ok('email duplicado -> 409 (conflicto claro, no 500)');
    else bad('email duplicado', `código ${dup.status}, esperado 409 :: ${(dup.text || '').slice(0, 200)}`);
  }

  // Clave foránea inexistente: 400/404/409, nunca 500.
  {
    const fk = await req('POST', '/api/students', {
      first_name: 'FK', last_name: 'Test', email: `fk.${Date.now()}@example.com`,
      date_of_birth: '2010-01-01', grade: '6to', branch_id: 99999999, academic_year_id: 99999999,
      enrollment_date: '2026-08-15',
    });
    if ([400, 404, 409].includes(fk.status)) ok(`FK inexistente -> ${fk.status} (no 500)`);
    else bad('FK inexistente', `código ${fk.status}, esperado 400/404/409 :: ${(fk.text || '').slice(0, 200)}`);
  }

  // =========================================================================
  log('\n7. ENDPOINTS ESPECIALIZADOS (acciones / reportes)');
  // =========================================================================
  if (ids.student) {
    await expectOne('GET', `/api/students/${ids.student}/photo`, '200,404', 'foto de estudiante');
    await expectOne('GET', `/api/gpa/cumulative/${ids.student}`, '200,404', 'GPA acumulado');
    await expectOne('POST', `/api/gpa/recalculate/${ids.student}`, '200,404,422', 'recalcular GPA');
    await expectOne('POST', `/api/credits/recalculate/${ids.student}`, '200,404,422', 'recalcular créditos');
    await expectOne('POST', `/api/graduation/validate/${ids.student}`, '200,404,422', 'validar graduación');
    await expectOne('GET', `/api/guardians/student/${ids.student}`, '200', 'acudientes del estudiante');
    await expectOne('GET', `/api/previous-schools/student/${ids.student}`, '200', 'escuelas previas');
    await expectOne('GET', `/api/academic-history/student/${ids.student}`, '200', 'historial académico');
    await expectOne('GET', `/api/transcripts/student/${ids.student}`, '200,404', 'transcripts del estudiante');
  }
  if (ids.teacher) {
    await expectOne('GET', `/api/teachers/${ids.teacher}/assignments`, '200', 'asignaciones del docente');
    await expectOne('GET', `/api/assignments/teacher/${ids.teacher}`, '200', 'asignaciones por docente');
  }
  if (ids.user) {
    await expectOne('GET', `/api/users/${ids.user}/roles`, '200', 'roles del usuario');
  }
  if (ids.role) {
    await expectOne('GET', `/api/roles/${ids.role}/permissions`, '200', 'permisos del rol');
  }
  if (ids.assignment) {
    await expectOne('GET', `/api/attendance/monthly/${ids.assignment}/2026/9`, '200,404', 'asistencia mensual');
    await expectOne('GET', `/api/assignments/section/A`, '200,404', 'asignaciones por sección');
  }
  if (ids.student) {
    await expectOne('GET', `/api/attendance/student/${ids.student}/2026/9`, '200,404', 'asistencia del estudiante');
  }

  // =========================================================================
  log('\n8. GENERACIÓN DE DOCUMENTOS (PDF) Y REPORTES');
  // =========================================================================
  {
    const rc = await req('GET', '/api/report-cards?limit=3');
    const list = rc.json?.data ?? rc.json?.items ?? [];
    if (Array.isArray(list) && list.length) {
      const id = list[0].id;
      const p = await req('GET', `/api/report-cards/${id}/preview`);
      if (p.status === 200 && (p.contentType.includes('pdf') || p.text.length > 500)) {
        ok(`GET /api/report-cards/${id}/preview -> 200 (${p.contentType}, ${(p.text || '').length} bytes)`);
      } else {
        bad(`GET /api/report-cards/${id}/preview`, `código ${p.status} · tipo ${p.contentType} :: ${(p.text || '').slice(0, 200).replace(/\s+/g, ' ')}`);
      }
    } else note('sin report-cards en la BD para probar preview');
  }

  {
    const tr = await req('GET', '/api/transcripts?limit=3');
    const list = tr.json?.data ?? tr.json?.items ?? [];
    if (Array.isArray(list) && list.length) {
      const id = list[0].id;
      const p = await req('GET', `/api/transcripts/${id}/preview`);
      if (p.status === 200) ok(`GET /api/transcripts/${id}/preview -> 200 (${p.contentType})`);
      else bad(`GET /api/transcripts/${id}/preview`, `código ${p.status} :: ${(p.text || '').slice(0, 200).replace(/\s+/g, ' ')}`);
    } else note('sin transcripts en la BD para probar preview');
  }

  // =========================================================================
  log('\n9. SEGURIDAD Y CABECERAS');
  // =========================================================================
  {
    const r = await req('GET', '/');
    const h = r.headers;
    h.get('x-content-type-options') ? ok('X-Content-Type-Options presente') : bad('X-Content-Type-Options', 'ausente');
    h.get('x-frame-options') || h.get('content-security-policy') ? ok('protección anti-clickjacking') : bad('anti-clickjacking', 'ausente');
    !h.get('x-powered-by') ? ok('no expone X-Powered-By') : bad('X-Powered-By', 'expuesto');
  }

  // Inyección SQL básica
  await expectOne('GET', "/api/students?search=' OR 1=1 --", '200', 'payload SQL no rompe');
  await expectOne('GET', '/api/students?search=<script>alert(1)</script>', '200', 'payload XSS no rompe');

  // =========================================================================
  log('\n10. PAGINACIÓN, ORDEN Y FILTROS');
  // =========================================================================
  await expectOne('GET', '/api/students?page=1&limit=5', '200', 'paginación');
  await expectOne('GET', '/api/students?sort=last_name&order=asc', '200', 'ordenamiento');
  await expectOne('GET', '/api/students?search=QA', '200', 'búsqueda');
  await expectOne('GET', '/api/students?page=abc&limit=-5', '200,400', 'paginación inválida no explota');

  // =========================================================================
  log('\n11. i18n');
  // =========================================================================
  await expectOne('GET', '/api/students?limit=1', '200', 'Accept-Language en-US', undefined, { lang: 'en-US' });
  await expectOne('GET', '/api/students?limit=1', '200', 'Accept-Language es-ES', undefined, { lang: 'es-ES' });

  // =========================================================================
  log('\n12. LOGOUT');
  // =========================================================================
  await expectOne('POST', '/api/auth/logout', '200', 'logout');

  // =========================================================================
  log('');
  log('='.repeat(78));
  log(` RESULTADO:  ${pass} PASS · ${fail} FAIL · ${warn} INFO · ${pass + fail} comprobaciones`);
  log('='.repeat(78));
  if (failures.length) {
    log('\nFALLOS DETALLADOS:');
    failures.forEach((f, i) => log(`  ${i + 1}. ${f.desc}\n     ${f.detail}`));
  }

  console.log(`\nRESULTADO: ${pass} PASS · ${fail} FAIL · ${warn} INFO`);
  if (failures.length) {
    console.log('\nFALLOS:');
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f.desc}\n     ${f.detail}`));
  }
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => {
  console.error('ERROR FATAL EN EL BARRIDO:', e);
  process.exit(2);
});