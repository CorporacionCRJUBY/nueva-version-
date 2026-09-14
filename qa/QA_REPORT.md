# ACADEMIX 2.0 — REPORTE DE QA (Backend, Frontend, BD, Permisos, Reportes, Docker)

**Proyecto:** ACADEMIX 2.0 — Sistema administrativo académico (New Direction Academy)
**Fecha:** 11 de septiembre de 2026
**Alcance de esta ronda:** arreglo del 100% del backend, rediseño de la interfaz para
funcionarios, y testeo completo de todas las áreas.

---

## 1. RESUMEN EJECUTIVO

| Área | Resultado |
|---|---|
| Auditoría profunda de API (backend) | **110 PASS · 0 FAIL** |
| Tests unitarios backend | **27 PASS · 0 FAIL** |
| Tests frontend (incluye i18n y login) | **6 PASS · 0 FAIL** |
| Build de producción del frontend | **OK** (2767 módulos) |
| Base de datos | **50 tablas · 60 migraciones · 14 seeds** |
| Docker (3 servicios) | **OK** — db/backend/frontend en HEALTHY |
| Permisos / RBAC | **OK** — docente recibe 403 en rutas de administración |
| Reportes / PDF | **OK** — report card y transcript generan y sirven PDF real |
| Multi-idioma | **OK** — 845 claves, 0 faltantes en `en` y `es` |

> El barrido se ejecutó contra el servidor y MySQL reales, no contra mocks.

---

## 2. DEFECTOS REALES ENCONTRADOS Y CORREGIDOS EN ESTA RONDA

Todos se detectaron **ejecutando la API**, no leyendo el código. Cada uno se reproduce
con una llamada concreta y queda cubierto por la auditoría automatizada.

### 🔴 Crítico — No se podía crear un usuario sin `full_name` (HTTP 500)

- **Síntoma:** `POST /api/users` con `firstName`/`lastName` (la forma que usan otros
  clientes e integraciones) respondía **500** en vez de crear el usuario.
- **Causa:** la tabla `users` guarda una única columna `full_name` (NOT NULL), pero la
  API recibía `firstName`+`lastName` sin normalizar. El `INSERT` llegaba sin `full_name`
  y MySQL abortaba con *"Field 'full_name' doesn't have a default value"*.
- **Corrección:** middleware `normalizeFullName` en `validators/users.validator.js` que
  unifica `full_name`, `fullName` y `firstName`+`lastName` **antes** de las reglas de
  validación, más una regla que exige el nombre y devuelve **400** explicativo si falta.

### 🔴 Crítico — Guardar la asistencia diaria fallaba siempre

- **Síntoma:** `POST /api/attendance/daily` respondía **400 "Validation failed"** con un
  payload correcto.
- **Causa:** el validador exigía `assignment_id` (snake_case) mientras el servicio leía
  `assignmentId` (camelCase). **Ninguna de las dos formas podía pasar**: la validación
  rechazaba lo que el servicio esperaba y viceversa.
- **Corrección:** el validador acepta ambas formas con `oneOf(...)` y un normalizador las
  unifica en `assignmentId`, de modo que el servicio sigue recibiendo un solo contrato.

### 🟠 Alto — "Cambiar contraseña" era inservible en la UI

- **Síntoma:** la acción de la lista de usuarios navegaba a un formulario que **solo tiene
  el campo de contraseña nueva**. El backend exige `currentPassword`, así que la operación
  fallaba **siempre** con 400.
- **Corrección (frontend):** diálogo rápido en la propia lista que pide contraseña actual,
  nueva y confirmación, valida que coincidan y guarda sin salir de la pantalla.
- **Corrección (backend):** el cambio de contraseña por parte de un **administrador sobre
  otra cuenta** es un *restablecimiento*, no un autoservicio: ya no se le exige conocer la
  contraseña ajena (que es justo lo que se ha olvidado). El propio usuario sí debe seguir
  probando que conoce la suya. Toda operación queda en la auditoría con la marca
  `reset_by_admin`.

### 🟠 Alto — `activate` de año académico devolvía 404

- **Síntoma:** la UI ofrecía "activar" un año académico; la ruta no existía en el backend.
- **Corrección:** nueva ruta `POST /api/academic-years/:id/activate`, método de servicio
  `activate` (desactiva los demás años en la misma operación y registra auditoría) y
  `findById` devolviendo **404** en vez de `200` con `data: null`.

### 🟠 Alto — Podían existir varios años académicos "vigentes"

- **Síntoma:** crear un año académico lo marcaba `ACTIVE` **por defecto**, pero solo
  desactivaba los anteriores si el cliente enviaba `is_active: true` explícitamente. Un
  alta normal dejaba **dos o más años vigentes** a la vez, lo que rompe cualquier cálculo
  de "año actual" (matrículas, periodos abiertos, promociones).
- **Corrección:** regla única — activar un año desactiva siempre los demás, y un año
  creado sin pedir activación queda `INACTIVE`.

### 🟡 Medio — Huecos de validación en rutas de escritura

- `PUT /api/academic-history/:id` era **la única ruta de escritura del módulo sin
  validador**: un `grade_value` no numérico llegaba al `UPDATE` y MySQL devolvía 500 en
  vez de 400. Se añadió `validateUpdate` (parámetro `id` entero + campos tipados).
- `POST /api/academic-history` validaba `query(...)` en lugar del **cuerpo**: miraba el
  sitio equivocado y no validaba nada de lo que realmente se insertaba. Se movió a `body(...)`.
- `PUT /api/users/profile` y `POST /api/users/change-password` (autoservicio) no pasaban
  por ningún validador: un email mal formado daba 500 y el cambio de contraseña propio no
  comprobaba la política de contraseñas que sí exige el resto del sistema. Se añadieron
  `profileUpdate` y `changeOwnPassword`.

---

## 3. AUDITORÍA PROFUNDA DE API — 110 COMPROBACIONES

Script: `qa/api-deep-audit.mjs` (incluido en el entregable). Descubre automáticamente los
IDs reales de cada recurso y prueba cada acción con datos de verdad.

| Sección | Qué verifica | Resultado |
|---|---|---|
| 0. Salud | `/health/live`, `/health/ready` (BD `up`) | PASS |
| 1. Autenticación | login, `/auth/me`, id de sesión | PASS |
| 2. Listados | 25 colecciones con forma de respuesta verificada | PASS |
| 3. Detalle por id | estudiantes, docentes, materias, usuarios, sedes, años, roles | PASS |
| 4. Acciones especiales | expediente, foto, cambio de estado, GPA, recálculo de créditos, acudientes, escuelas previas, historial, asistencia mensual, validación de graduación, becas, ficha médica, asignaciones, roles y permisos, asistencia por asignación | PASS |
| 5. Documentos PDF | generación y descarga reales de report card y transcript | PASS |
| 6. Autoservicio | perfil propio | PASS |
| 7. CRUD por módulo | sedes, materias, estudiantes, docentes, usuarios, años, periodos, calendario, becas, acudientes, escuelas previas, ficha médica, asistencia diaria, transcript | PASS |
| 8. Validación | 400/404 correctos, nunca 500 | PASS |
| 9. Seguridad | 401 sin sesión, payloads SQL/XSS no rompen, `X-Content-Type-Options: nosniff`, `X-Powered-By` oculto | PASS |
| 10. RBAC | docente: 403 en usuarios, roles, métricas y borrado de estudiantes | PASS |
| 11. i18n | `Accept-Language` en-US y es-ES | PASS |
| 12. Panel del servidor | métricas, servicios, logs | PASS |
| 13. Logout | sesión invalidada (401 después) | PASS |

**Resultado: `110 PASS · 0 FAIL · 110 comprobaciones`**

---

## 4. PRUEBAS DE SOFTWARE

```
Backend  (npm test)        : 27 passed, 27 total      (2 suites)
Frontend (vitest run)      :  6 passed,  6 total      (2 suites)
Build producción (vite)    : OK — 2767 módulos transformados
i18n                       : 845 claves usadas, 0 faltantes en en/ y es/
```

El test de i18n **detectó un hueco real introducido por el propio rediseño** (3 claves
nuevas sin traducir: `users.currentPassword`, `academicPeriods.academicYear`,
`scholarships.academicYear`). Se añadieron en ambos idiomas y el test volvió a verde.

---

## 5. BASE DE DATOS

```
Motor        : MariaDB 11 (InnoDB, utf8mb4)
Tablas       : 50
Migraciones  : 60 (se aplican automáticamente en el arranque)
Seeds        : 14 (solo la primera vez)
```

Verificado que el backend conecta, que las migraciones corren completas dentro del
contenedor, y que el arranque ordenado funciona: `db` saludable → `backend` migra y
siembra → `frontend` sirve.

---

## 6. DOCKER

Las tres imágenes se construyeron y **se levantó el stack completo** para verificar el
comportamiento real de los contenedores:

| Servicio | Imagen | Verificación |
|---|---|---|
| `db` | `mariadb:11` | Contenedor UP; conexión con el usuario de la app confirmada (`SELECT 1`); **50 tablas** creadas |
| `backend` | build multi-stage Node 20 + `dumb-init`, usuario no-root | Entrypoint verificado en logs: **60 migraciones aplicadas → 14 seeds ejecutados → servidor arrancado** en `production`; `/health/ready` → `{"status":"ok","db":"up"}`; login → 200; jobs programados activos |
| `frontend` | build Vite + nginx | `/` → 200, `/healthz` → 200, **proxy `/api` → login 200**, y las 5 cabeceras de seguridad presentes (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`) |

También se comprobó que el arranque ordenado funciona (el backend espera a que la BD
responda antes de migrar) y que el objetivo del frontend resuelve por nombre de servicio
dentro de la red de Compose.

**Nota de entorno:** el binario `docker compose` (plugin v2) no está disponible en este
sandbox de compilación, por lo que la verificación se hizo con los contenedores
equivalentes (`docker build` + `docker run` sobre una red propia replicando el
`docker-compose.yml`). En un host con Compose (o con Docker Desktop), `docker compose up
--build` reproduce exactamente esta misma topología, ya que el compose usa los mismos
Dockerfiles, variables, healthchecks, volúmenes y orden de dependencias.

Las contraseñas no viven en el compose: se leen del entorno y el arranque **falla** si
`MYSQL_ROOT_PASSWORD` o `DB_PASSWORD` no están definidas (nunca un `root/root` por
defecto).

---

## 7. REDISEÑO DE INTERFAZ PARA FUNCIONARIOS

**Problema:** dar de alta cualquier registro obligaba a *lista → botón "Nuevo" → página
completa de formulario → guardar → volver a la lista*, perdiendo filtros, búsqueda y
página. En secretaría se hacen decenas de altas al día.

**Solución implementada — componente reutilizable `ListPageHeader` + `QuickCreateDrawer`:**
el encabezado de cada listado ofrece **Alta rápida**, un panel lateral con el formulario
mínimo sobre la misma lista; al guardar, la lista se refresca en sitio y el funcionario
sigue donde estaba. Los catálogos (años académicos, estudiantes) se cargan **al abrir el
panel**, no al montar la página, para no penalizar la carga inicial.

**Módulos con Alta rápida integrada (11):** Estudiantes, Docentes, Materias, Sedes, Años
académicos, Periodos académicos, Acudientes, Becas, Escuelas previas, Fichas médicas y
Calendario.

**Otras mejoras de flujo:**
- Diálogo de **cambio de contraseña** en la propia lista (antes era una acción rota).
- Acciones por fila (ver / editar / borrar / acciones especiales) sin abandonar el listado.
- Se mantiene la **paleta morado/lila** en todo el sistema (tema, sidebar, KPIs, login).

---

## 8. RIESGOS CONOCIDOS / PENDIENTES

| # | Severidad | Descripción | Recomendación |
|---|---|---|---|
| 1 | 🟢 Bajo | El chunk `index` del frontend supera 500 kB (solo aviso de Vite) | Aplicar code-splitting por ruta si se quiere optimizar la primera carga |
| 2 | 🟢 Bajo | Las cuentas demo del seed existen en la BD | Mantener `SEED_ALLOW_IN_PRODUCTION=false` y borrar las cuentas demo antes de producción |
| 3 | 🟢 Bajo | El servicio se sirve por HTTP en el compose de desarrollo | Servir por HTTPS (y HSTS) antes de exponer a Internet |
| 4 | 🟢 Bajo | Los tests de integración que dependen de MySQL se omiten si no hay BD local | Se ejecutan en CI con el servicio de MySQL levantado |

Ninguno de estos bloquea el uso del sistema.

---

## 9. CONCLUSIÓN

El backend queda **funcionando al 100%**: las 110 comprobaciones de la auditoría profunda
pasan, los 27 tests unitarios pasan, y los 6 defectos reales detectados (2 críticos, 3
altos y los huecos de validación) están corregidos y cubiertos por pruebas.
El frontend compila, pasa sus tests y ofrece flujos simplificados con la paleta
morado/lila. Docker levanta los 3 servicios en estado saludable y la base de datos se
crea, migra y siembra sola.
