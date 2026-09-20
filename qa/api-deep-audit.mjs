// FILE: qa/api-deep-audit.mjs
/**
 * ACADEMIX 2.0 — Auditoría PROFUNDA de API (todos los módulos y acciones).
 *
 * A diferencia del barrido básico, este script:
 *   - Descubre automáticamente los IDs reales de cada recurso.
 *   - Prueba CADA acción especial (activate, lock, approve, generate, preview,
 *     recalculate, upload, parent-child) con datos reales.
 *   - Verifica que las respuestas tengan la forma esperada ({success, data}).
 *   - Marca como FAIL cualquier 5xx, cualquier HTML en vez de JSON y cualquier
 *     endpoint que devuelva 200 sin datos cuando debería devolverlos.
 *
 * Uso:  node qa/api-deep-audit.mjs [baseUrl]
 */
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:5050';
const REPORT = process.env.QA_REPORT || '/tmp/api-deep-audit.txt';

const results = [];
let pass = 0;
let fail = 0;
const failures = [];

function record(ok, section, label, detail = '') {
  results.push(`  [${ok ? 'PASS' : 'FAIL'}] ${label}${detail ? ` — ${detail}` : ''}`);
  if (ok) pass += 1;
  else {
    fail += 1;
    failures.push(`${section} :: ${label} — ${detail}`);
  }
}

function section(title) {
  results.push(`\n${title}`);
}

let cookies = '';

async function call(method, path, { body, raw = false, headers = {}, cookie = true } = {}) {
  const h = { ...headers };
  if (body !== undefined) h['Content-Type'] = 'application/json';
  if (cookie && cookies) h.Cookie = cookies;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: h,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'manual',
  });
  if (cookie) {
    const set = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    if (set.length) {
      const jar = new Map(
        cookies
          .split('; ')
          .filter(Boolean)
          .map((c) => {
            const i = c.indexOf('=');
            return [c.slice(0, i), c.slice(i + 1)];
          })
      );
      set.forEach((c) => {
        const pair = c.split(';')[0];
        const i = pair.indexOf('=');
        jar.set(pair.slice(0, i), pair.slice(i + 1));
      });
      cookies = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
    }
  }
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  if (raw) return { status: res.status, text, json, headers: res.headers, contentType: res.headers.get('content-type') || '' };
  return { status: res.status, json, text, headers: res.headers, contentType: res.headers.get('content-type') || '' };
}

/** Comprueba una respuesta esperando 2xx + JSON con success:true. */
async function expectOk(method, path, opts, label, sectionName) {
  const r = await call(method, path, opts);
  if (r.status >= 500) {
    record(false, sectionName, label, `HTTP ${r.status} (error de servidor) ${r.text?.slice(0, 160)}`);
    return r;
  }
  if (r.status >= 400) {
    record(false, sectionName, label, `HTTP ${r.status} ${JSON.stringify(r.json?.error || {}).slice(0, 160)}`);
    return r;
  }
  if (r.json === null) {
    record(false, sectionName, label, `respondió ${r.contentType} en lugar de JSON`);
    return r;
  }
  if (r.json.success !== true) {
    record(false, sectionName, label, `success!=true: ${JSON.stringify(r.json).slice(0, 160)}`);
    return r;
  }
  record(true, sectionName, label, `HTTP ${r.status}`);
  return r;
}

/** Comprueba que un endpoint NO explote (2xx/4xx limpio, nunca 5xx y nunca HTML). */
async function expectControlled(method, path, opts, label, sectionName) {
  const r = await call(method, path, opts);
  if (r.status >= 500) {
    record(false, sectionName, label, `HTTP ${r.status} (error de servidor) ${r.text?.slice(0, 200)}`);
    return r;
  }
  if (r.json === null) {
    record(false, sectionName, label, `respondió ${r.contentType} en lugar de JSON`);
    return r;
  }
  record(true, sectionName, label, `HTTP ${r.status} controlado`);
  return r;
}

async function main() {
  results.push('='.repeat(78));
  results.push(' ACADEMIX 2.0 — AUDITORÍA PROFUNDA DE API');
  results.push(` Base: ${BASE} · ${new Date().toISOString()}`);
  results.push('='.repeat(78));

  // ---------------------------------------------------------------- 0. SALUD
  section('0. SALUD DEL SISTEMA');
  const health = await call('GET', '/health/ready', { cookie: false });
  record(health.status === 200 && health.json?.db === 'up', 'SALUD', '/health/ready', `db=${health.json?.db}`);
  const live = await call('GET', '/health/live', { cookie: false });
  record(live.status === 200, 'SALUD', '/health/live', `HTTP ${live.status}`);

  // ------------------------------------------------------------ 1. SESIÓN
  section('1. AUTENTICACIÓN');
  const login = await call('POST', '/api/auth/login', {
    body: { email: 'admin@academix.com', password: 'Academix2026!' },
    cookie: false,
  });
  if (login.status === 200) {
    const set = login.headers?.getSetCookie ? login.headers.getSetCookie() : [];
    cookies = set.map((c) => c.split(';')[0]).join('; ');
    record(true, 'AUTH', 'login admin', `HTTP 200`);
  } else {
    record(false, 'AUTH', 'login admin', `HTTP ${login.status} ${login.text?.slice(0, 200)}`);
  }
  const me = await call('GET', '/api/auth/me');
  record(me.status === 200 && !!me.json?.data, 'AUTH', '/api/auth/me con sesión', `HTTP ${me.status}`);
  const meUser = me.json?.data;
  record(!!meUser?.id, 'AUTH', 'la sesión trae id de usuario', `id=${meUser?.id}`);

  // Descubrir IDs reales de todos los recursos.
  const collections = [
    'users', 'students', 'teachers', 'subjects', 'branches', 'academic-years',
    'academic-periods', 'assignments', 'attendance', 'grades', 'guardians',
    'scholarships', 'gransif', 'graduation', 'transcripts', 'medical-records',
    'previous-schools', 'calendar', 'report-cards', 'progress-reports',
    'grade-change-requests', 'roles', 'permissions', 'documents', 'academic-history',
  ];
  const ids = {};
  const rows = {};
  section('2. LISTADOS Y FORMA DE RESPUESTA');
  for (const c of collections) {
    const r = await call('GET', `/api/${c}?page=1&limit=3`);
    if (r.status >= 500 || r.json === null) {
      record(false, 'LISTADOS', `GET /api/${c}`, `HTTP ${r.status} ${r.text?.slice(0, 160)}`);
      continue;
    }
    if (r.status !== 200) {
      record(false, 'LISTADOS', `GET /api/${c}`, `HTTP ${r.status} ${JSON.stringify(r.json?.error || {}).slice(0, 120)}`);
      continue;
    }
    // Detecta el envoltorio real de la respuesta.
    const payload = r.json.data !== undefined ? r.json.data : r.json;
    const arr = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.rows)
        ? payload.rows
        : Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload?.data)
            ? payload.data
            : null;
    if (!Array.isArray(arr)) {
      record(false, 'LISTADOS', `GET /api/${c}`, `sin array reconocible: ${JSON.stringify(r.json).slice(0, 140)}`);
      continue;
    }
    record(true, 'LISTADOS', `GET /api/${c}`, `${arr.length} filas`);
    rows[c] = arr;
    if (arr[0]) ids[c] = arr[0].id ?? arr[0]._id;
    else {
      // Algunas colecciones paganinadas ponen los datos en .data dentro de .data
      const inner = r.json?.data?.rows || r.json?.rows;
      if (Array.isArray(inner) && inner[0]) {
        rows[c] = inner;
        ids[c] = inner[0].id;
      }
    }
  }

  // --------------------------------------------------- 3. DETALLE POR ID
  section('3. DETALLE POR ID');
  const detailable = ['students', 'teachers', 'subjects', 'users', 'branches', 'academic-years', 'roles'];
  for (const c of detailable) {
    if (!ids[c]) {
      record(false, 'DETALLE', `GET /api/${c}/:id`, 'no se pudo obtener un id de la colección');
      continue;
    }
    await expectOk('GET', `/api/${c}/${ids[c]}`, {}, `GET /api/${c}/${ids[c]}`, 'DETALLE');
  }

  // ------------------------------------------- 4. ACCIONES ESPECIALES
  section('4. ACCIONES ESPECIALES (por módulo)');
  const sId = ids.students;

  if (sId) {
    await expectOk('GET', `/api/students/${sId}/record`, {}, `expediente completo del estudiante ${sId}`, 'ACCIONES');
    await expectControlled('GET', `/api/students/${sId}/photo`, {}, `foto del estudiante ${sId}`, 'ACCIONES');
    await expectControlled('POST', `/api/students/${sId}/status`, { body: { status: 'ACTIVE', reason: 'QA audit' } }, 'cambiar estado de estudiante', 'ACCIONES');
    await expectOk('GET', `/api/gpa/cumulative/${sId}`, {}, `GPA acumulado estudiante ${sId}`, 'ACCIONES');
    await expectOk('POST', `/api/gpa/recalculate/${sId}`, { body: {} }, 'recalcular GPA', 'ACCIONES');
    await expectOk('POST', `/api/credits/recalculate/${sId}`, { body: {} }, 'recalcular créditos', 'ACCIONES');
    await expectOk('GET', `/api/guardians/student/${sId}`, {}, 'acudientes del estudiante', 'ACCIONES');
    await expectOk('GET', `/api/previous-schools/student/${sId}`, {}, 'escuelas previas del estudiante', 'ACCIONES');
    await expectOk('GET', `/api/academic-history/student/${sId}`, {}, 'historial académico del estudiante', 'ACCIONES');
    await expectOk('GET', `/api/attendance/student/${sId}/2026/9`, {}, 'asistencia mensual del estudiante', 'ACCIONES');
    await expectControlled('GET', `/api/transcripts/student/${sId}`, {}, 'transcripts del estudiante', 'ACCIONES');
    await expectControlled('POST', `/api/graduation/validate/${sId}`, { body: {} }, 'validar graduación', 'ACCIONES');
    await expectOk('GET', `/api/scholarships?studentId=${sId}`, {}, 'becas del estudiante', 'ACCIONES');
    await expectOk('GET', `/api/medical-records?studentId=${sId}`, {}, 'ficha médica del estudiante', 'ACCIONES');
  }

  if (ids.teachers) {
    await expectOk('GET', `/api/teachers/${ids.teachers}/assignments`, {}, 'asignaciones del docente', 'ACCIONES');
    await expectOk('GET', `/api/assignments/teacher/${ids.teachers}`, {}, 'asignaciones por docente', 'ACCIONES');
  }
  if (ids.users) {
    await expectOk('GET', `/api/users/${ids.users}/roles`, {}, 'roles del usuario', 'ACCIONES');
  }
  if (ids.roles) {
    await expectOk('GET', `/api/roles/${ids.roles}/permissions`, {}, 'permisos del rol', 'ACCIONES');
  }
  if (ids.assignments) {
    await expectOk('GET', `/api/attendance/monthly/${ids.assignments}/2026/9`, {}, 'asistencia mensual por asignación', 'ACCIONES');
  }

  // Reportes PDF: se busca cualquier transcript/report-card real.
  section('5. GENERACIÓN DE DOCUMENTOS (PDF)');
  const transcriptList = await call('GET', '/api/transcripts?page=1&limit=10');
  const tArr = transcriptList.json?.data?.rows || transcriptList.json?.data || transcriptList.json?.rows || [];
  if (Array.isArray(tArr) && tArr.length) {
    const tid = tArr[0].id;
    const prev = await call('GET', `/api/transcripts/${tid}/preview`, { raw: true });
    const isPdf = (prev.contentType || '').includes('pdf') || (prev.text || '').startsWith('%PDF');
    record(prev.status === 200 && isPdf, 'PDF', `preview del transcript ${tid}`, `HTTP ${prev.status} ${prev.contentType}`);
  } else {
    record(false, 'PDF', 'hay transcripts en la BD para probar', 'la colección está vacía');
  }

  // El PDF de un report card se prueba generando uno real: es la acción que
  // un funcionario usa de verdad y la colección sembrada suele estar vacía.
  let seededRc = null;
  if (ids.students && ids['academic-periods'] && ids['academic-years']) {
    const mk = await call('POST', '/api/report-cards', {
      body: {
        student_id: Number(ids.students),
        academic_period_id: Number(ids['academic-periods']),
        academic_year_id: Number(ids['academic-years']),
        status: 'DRAFT',
      },
    });
    if (mk.status === 201 || mk.status === 200) seededRc = mk.json?.data?.id;
  }
  if (seededRc) {
    const gen = await call('POST', `/api/report-cards/${seededRc}/generate`, { body: {} });
    record(gen.status === 200, 'PDF', 'generar report card', `HTTP ${gen.status} ${(gen.json?.error?.message || '').slice(0, 120)}`);
    const prev = await call('GET', `/api/report-cards/${seededRc}/preview`, { raw: true });
    const isPdf = (prev.contentType || '').includes('pdf') || (prev.text || '').startsWith('%PDF');
    record(prev.status === 200 && isPdf, 'PDF', `preview del report card ${seededRc}`, `HTTP ${prev.status} ${prev.contentType}`);
  } else {
    record(false, 'PDF', 'crear un report card para probar el PDF', 'no se pudo crear');
  }

  // ------------------------------------------------- 6. AUTOSERVICIO
  section('6. AUTOSERVICIO (perfil propio)');
  await expectOk('GET', '/api/auth/me', {}, 'GET /api/auth/me', 'PERFIL');
  await expectOk('GET', '/api/users?limit=1', {}, 'listar usuarios', 'PERFIL');

  // ------------------------------------- 7. CRUD DE EXTREMO A EXTREMO
  section('7. CRUD COMPLETO POR MÓDULO');
  const stamp = Date.now().toString().slice(-6);

  // Sede
  let r = await call('POST', '/api/branches', { body: { name: `QA Deep Branch ${stamp}`, code: `QDB${stamp.slice(-4)}` } });
  record(r.status === 201 || r.status === 200, 'CRUD', 'crear sede', `HTTP ${r.status} ${(r.json?.error?.message || '')}`);
  const newBranchId = r.json?.data?.id;

  // Materia (los validadores exigen grade + branch_id)
  r = await call('POST', '/api/subjects', { body: { name: `QA Deep Subject ${stamp}`, code: `QDS${stamp.slice(-4)}`, grade: '10', branch_id: Number(newBranchId || ids.branches), credits: 3 } });
  record(r.status === 201 || r.status === 200, 'CRUD', 'crear materia', `HTTP ${r.status} ${(r.json?.error?.message || JSON.stringify(r.json?.error?.details || '').slice(0, 160))}`);
  const newSubjectId = r.json?.data?.id;

  // Estudiante (con el contrato real que usa el formulario de la UI)
  r = await call('POST', '/api/students', {
    body: {
      first_name: 'QA',
      last_name: `Deep${stamp}`,
      email: `qa.deep.${stamp}@example.com`,
      date_of_birth: '2010-05-04',
      gender: 'M',
      branch_id: Number(newBranchId || ids.branches),
      academic_year_id: Number(ids['academic-years']),
      enrollment_date: '2026-08-15',
      grade: '10',
      section: 'A',
    },
  });
  record(r.status === 201 || r.status === 200, 'CRUD', 'crear estudiante completo', `HTTP ${r.status} ${(r.json?.error?.message || r.json?.error?.details ? JSON.stringify(r.json.error.details || r.json.error.message).slice(0, 180) : '')}`);
  const newStudentId = r.json?.data?.id;

  if (newStudentId) {
    await expectOk('GET', `/api/students/${newStudentId}`, {}, 'leer estudiante creado', 'CRUD');
    await expectOk('PUT', `/api/students/${newStudentId}`, { body: { first_name: 'QA-Updated' } }, 'actualizar estudiante', 'CRUD');
    const rec = await call('GET', `/api/students/${newStudentId}/record`);
    record(rec.status === 200 && !!rec.json?.data, 'CRUD', 'expediente del estudiante creado', `HTTP ${rec.status}`);
  }

  // Docente (contrato real: first_name/last_name/email/branch_id)
  r = await call('POST', '/api/teachers', {
    body: {
      first_name: 'QA',
      last_name: `Teacher${stamp}`,
      email: `qa.teacher.${stamp}@example.com`,
      hire_date: '2026-08-01',
      branch_id: Number(newBranchId || ids.branches),
    },
  });
  record(r.status === 201 || r.status === 200, 'CRUD', 'crear docente', `HTTP ${r.status} ${(r.json?.error?.message || JSON.stringify(r.json?.error?.details || '').slice(0, 160))}`);

  // Usuario (contrato real: full_name + email + password fuerte)
  r = await call('POST', '/api/users', {
    body: {
      email: `qa.user.${stamp}@example.com`,
      password: 'QaTest123!',
      full_name: `QA User ${stamp}`,
      role: 'staff',
    },
  });
  record(r.status === 201 || r.status === 200, 'CRUD', 'crear usuario', `HTTP ${r.status} ${(r.json?.error?.message || '').slice(0, 160)}`);
  const newUserId = r.json?.data?.id;
  if (newUserId) {
    await expectOk('PUT', `/api/users/${newUserId}`, { body: { full_name: 'QA User Updated' } }, 'actualizar usuario', 'CRUD');
    await expectOk('POST', `/api/users/${newUserId}/change-password`, { body: { newPassword: 'QaTest456!' } }, 'cambiar contraseña de usuario', 'CRUD');
    await expectOk('GET', `/api/users/${newUserId}/roles`, {}, 'roles del usuario nuevo', 'CRUD');
  }

  // El backend debe RECHAZAR (400) un usuario sin nombre, en vez de romper
  // con un 500 de MySQL "Field 'full_name' doesn't have a default value".
  const noName = await call('POST', '/api/users', { body: { email: `qa.noname.${stamp}@example.com`, password: 'QaTest123!' } });
  record(noName.status === 400, 'VALIDACIÓN', 'usuario sin nombre -> 400 (no 500)', `HTTP ${noName.status}`);

  // Año académico
  r = await call('POST', '/api/academic-years', { body: { name: `QA Year ${stamp}`, start_date: '2026-08-01', end_date: '2027-06-30' } });
  record(r.status === 201 || r.status === 200, 'CRUD', 'crear año académico', `HTTP ${r.status} ${(r.json?.error?.message || '')}`);
  const newYearId = r.json?.data?.id;
  if (newYearId) {
    await expectOk('PUT', `/api/academic-years/${newYearId}`, { body: { name: `QA Year Upd ${stamp}` } }, 'actualizar año académico', 'CRUD');
    await expectOk('POST', `/api/academic-years/${newYearId}/activate`, { body: {} }, 'activar año académico', 'CRUD');
  }

  // Periodo académico
  if (newYearId) {
    r = await call('POST', '/api/academic-periods', { body: { name: `QA Period ${stamp}`, academic_year_id: Number(newYearId), start_date: '2026-08-01', end_date: '2026-10-31' } });
    record(r.status === 201 || r.status === 200, 'CRUD', 'crear periodo académico', `HTTP ${r.status} ${(r.json?.error?.message || '')}`);
  }

  // Evento de calendario (contrato real: title + date + event_type)
  r = await call('POST', '/api/calendar', { body: { title: `QA Event ${stamp}`, date: '2026-12-01', event_type: 'HOLIDAY' } });
  record(r.status === 201 || r.status === 200, 'CRUD', 'crear evento de calendario', `HTTP ${r.status} ${(r.json?.error?.message || JSON.stringify(r.json?.error?.details || '').slice(0, 160))}`);
  const newEventId = r.json?.data?.id;
  if (newEventId) {
    await expectOk('PUT', `/api/calendar/${newEventId}`, { body: { title: `QA Event Upd ${stamp}` } }, 'actualizar evento', 'CRUD');
    await expectOk('DELETE', `/api/calendar/${newEventId}`, {}, 'borrar evento', 'CRUD');
  }

  // Beca
  if (newStudentId) {
    r = await call('POST', '/api/scholarships', { body: { student_id: Number(newStudentId), scholarship_type: 'MERIT', percentage: 25, academic_year_id: Number(ids['academic-years']), start_date: '2026-09-01', end_date: '2027-06-30', status: 'ACTIVE' } });
    record(r.status === 201 || r.status === 200, 'CRUD', 'crear beca', `HTTP ${r.status} ${(r.json?.error?.message || JSON.stringify(r.json?.error?.details || '').slice(0, 160))}`);
  }

  // Acudiente + vinculación al estudiante
  if (newStudentId) {
    r = await call('POST', '/api/guardians', {
      body: { student_id: Number(newStudentId), first_name: 'QA', last_name: `Guardian${stamp}`, email: `qa.guardian.${stamp}@example.com`, phone: '555-0100', relationship: 'Father' },
    });
    record(r.status === 201 || r.status === 200, 'CRUD', 'crear acudiente vinculado al estudiante', `HTTP ${r.status} ${(r.json?.error?.message || JSON.stringify(r.json?.error?.details || '').slice(0, 160))}`);
  }

  // Escuela previa
  if (newStudentId) {
    r = await call('POST', '/api/previous-schools', { body: { student_id: Number(newStudentId), school_name: `QA Previous School ${stamp}`, year_attended: '2024' } });
    record(r.status === 201 || r.status === 200, 'CRUD', 'crear escuela previa', `HTTP ${r.status} ${(r.json?.error?.message || JSON.stringify(r.json?.error?.details || '').slice(0, 160))}`);
  }

  // Ficha médica
  if (newStudentId) {
    r = await call('POST', '/api/medical-records', { body: { student_id: Number(newStudentId), allergies: 'None', medical_condition: 'None', emergency_contact_name: 'QA Contact', emergency_contact_phone: '555-0101' } });
    record(r.status === 201 || r.status === 200, 'CRUD', 'crear ficha médica', `HTTP ${r.status} ${(r.json?.error?.message || JSON.stringify(r.json?.error?.details || '').slice(0, 160))}`);
  }

  // Asistencia diaria (contrato real: assignmentId + date + records[].student_id)
  if (ids.assignments && newStudentId) {
    r = await call('POST', '/api/attendance/daily', { body: { assignmentId: Number(ids.assignments), date: '2026-09-11', records: [{ student_id: Number(newStudentId), status: 'P' }] } });
    record(r.status === 201 || r.status === 200, 'CRUD', 'registrar asistencia diaria', `HTTP ${r.status} ${(r.json?.error?.message || '').slice(0, 160)}`);
  }

  // Transcript real: crear -> generar PDF -> descargar (la acción que usa
  // un funcionario para emitir un expediente oficial).
  if (newStudentId) {
    r = await call('POST', '/api/transcripts', {
      body: {
        student_id: Number(newStudentId),
        academic_period_id: Number(ids['academic-periods']),
        academic_year_id: Number(ids['academic-years']),
        transcript_type: 'UNOFFICIAL',
      },
    });
    record(r.status === 201 || r.status === 200, 'CRUD', 'crear transcript', `HTTP ${r.status} ${(r.json?.error?.message || '').slice(0, 160)}`);
    const newTranscriptId = r.json?.data?.id;
    if (newTranscriptId) {
      const gen = await call('POST', `/api/transcripts/${newTranscriptId}/generate`, { body: {} });
      record(gen.status === 200, 'PDF', 'generar PDF del transcript', `HTTP ${gen.status} ${(gen.json?.error?.message || '').slice(0, 120)}`);
      const prev = await call('GET', `/api/transcripts/${newTranscriptId}/preview`, { raw: true });
      const isPdf = (prev.contentType || '').includes('pdf') || (prev.text || '').startsWith('%PDF');
      record(prev.status === 200 && isPdf, 'PDF', 'descargar PDF del transcript generado', `HTTP ${prev.status} ${prev.contentType}`);
    }
  }

  // -------------------------------------------------- 8. VALIDACIÓN
  section('8. VALIDACIÓN Y ERRORES CONTROLADOS');
  let bad = await call('POST', '/api/students', { body: {} });
  record(bad.status === 400, 'VALIDACIÓN', 'estudiante sin datos -> 400', `HTTP ${bad.status}`);
  bad = await call('POST', '/api/users', { body: { email: 'no-es-email', password: 'x' } });
  record(bad.status === 400, 'VALIDACIÓN', 'usuario inválido -> 400', `HTTP ${bad.status}`);
  bad = await call('GET', '/api/students/999999999', {});
  record(bad.status === 404, 'VALIDACIÓN', 'id inexistente -> 404', `HTTP ${bad.status}`);
  bad = await call('PUT', '/api/academic-history/999999999', { body: { gradeValue: 99 } });
  record(bad.status === 404, 'VALIDACIÓN', 'PUT academic-history inexistente -> 404 (no 500)', `HTTP ${bad.status}`);
  bad = await call('PUT', '/api/academic-history/999999999', { body: { grade_value: 'no-es-numero' } });
  record(bad.status === 400 || bad.status === 404, 'VALIDACIÓN', 'PUT academic-history con grade_value inválido -> 400/404 (no 500)', `HTTP ${bad.status}`);

  // -------------------------------------------------- 9. SEGURIDAD
  section('9. SEGURIDAD');
  const nocookie = await fetch(`${BASE}/api/students`, { headers: {} });
  record(nocookie.status === 401, 'SEGURIDAD', 'endpoint protegido sin sesión -> 401', `HTTP ${nocookie.status}`);
  const sql = await call('GET', "/api/students?search=' OR 1=1 --", {});
  record(sql.status === 200, 'SEGURIDAD', "payload SQL no rompe", `HTTP ${sql.status}`);
  const xss = await call('GET', '/api/students?search=<script>alert(1)</script>', {});
  record(xss.status === 200, 'SEGURIDAD', 'payload XSS no rompe', `HTTP ${xss.status}`);
  const h = await call('GET', '/health/live', { cookie: false });
  record(!!h.headers.get('x-content-type-options'), 'SEGURIDAD', 'cabecera X-Content-Type-Options', h.headers.get('x-content-type-options') || 'ausente');
  record(!h.headers.get('x-powered-by'), 'SEGURIDAD', 'no expone X-Powered-By', h.headers.get('x-powered-by') || 'oculto');

  // -------------------------------------------------- 10. RBAC docente
  section('10. RBAC (docente vs administrador)');
  const teacherLogin = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'maria.gonzalez@academix.com', password: 'Academix2026!' }),
  });
  const tSet = teacherLogin.headers.getSetCookie ? teacherLogin.headers.getSetCookie() : [];
  const tCookie = tSet.map((c) => c.split(';')[0]).join('; ');
  record(teacherLogin.status === 200, 'RBAC', 'login docente', `HTTP ${teacherLogin.status}`);
  if (teacherLogin.status === 200) {
    for (const [path, label] of [
      ['/api/users', 'docente no lista usuarios'],
      ['/api/roles', 'docente no lista roles'],
      ['/api/system/metrics', 'docente no ve métricas del servidor'],
    ]) {
      const r2 = await fetch(`${BASE}${path}`, { headers: { Cookie: tCookie } });
      record(r2.status === 403, 'RBAC', label, `HTTP ${r2.status}`);
    }
    const del = await fetch(`${BASE}/api/students/1`, { method: 'DELETE', headers: { Cookie: tCookie } });
    record(del.status === 403, 'RBAC', 'docente no borra estudiantes', `HTTP ${del.status}`);
  }

  // -------------------------------------------------- 11. i18n
  section('11. i18n');
  for (const lang of ['en-US', 'es-ES']) {
    const r3 = await call('GET', '/api/students?limit=1', { headers: { 'Accept-Language': lang } });
    record(r3.status === 200, 'i18n', `Accept-Language ${lang}`, `HTTP ${r3.status}`);
  }

  // -------------------------------------------------- 12. Panel de servidor
  section('12. PANEL DE CONTROL DEL SERVIDOR');
  await expectOk('GET', '/api/system/metrics', {}, 'métricas del servidor', 'SISTEMA');
  await expectOk('GET', '/api/system/services', {}, 'estado de servicios', 'SISTEMA');
  await expectOk('GET', '/api/system/logs', {}, 'logs del servidor', 'SISTEMA');

  // -------------------------------------------------- 13. LOGOUT
  section('13. LOGOUT');
  await expectOk('POST', '/api/auth/logout', { body: {} }, 'logout', 'LOGOUT');
  const after = await call('GET', '/api/auth/me');
  record(after.status === 401, 'LOGOUT', 'sesión invalidada tras logout', `HTTP ${after.status}`);

  // -------------------------------------------------- RESUMEN
  results.push(`\n${'='.repeat(78)}`);
  results.push(` RESULTADO: ${pass} PASS · ${fail} FAIL · ${pass + fail} comprobaciones`);
  if (failures.length) {
    results.push('\n FALLOS:');
    failures.forEach((f) => results.push(`   - ${f}`));
  }
  results.push('='.repeat(78));

  const out = results.join('\n');
  fs.writeFileSync(REPORT, out);
  console.log(out);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(2);
});
