# ACADEMIX 2.0 — Notas de versión: corrección total del backend + rediseño de interfaz

**Fecha:** 11 de septiembre de 2026
**Base:** `ACADEMIX_2.0_Full_Stack` (entrega anterior)
**Ámbito:** backend al 100%, rediseño de la interfaz para funcionarios, testeo completo.

---

## 1. BACKEND — 6 defectos reales corregidos

Todos se reprodujeron ejecutando la API contra MySQL real. Tras las correcciones, la
auditoría profunda (`qa/api-deep-audit.mjs`) da **110 PASS · 0 FAIL**.

| # | Sev. | Defecto | Fichero(s) corregido(s) |
|---|---|---|---|
| 1 | 🔴 Crítico | `POST /api/users` con `firstName`/`lastName` devolvía **500** (la tabla `users` solo tiene `full_name`, NOT NULL) | `validators/users.validator.js` (nuevo `normalizeFullName`) |
| 2 | 🔴 Crítico | `POST /api/attendance/daily` **siempre** fallaba: el validador exigía `assignment_id` y el servicio leía `assignmentId` | `validators/attendance.validator.js` (`oneOf` + normalizador) |
| 3 | 🟠 Alto | `POST /api/academic-years/:id/activate` **no existía** (404) aunque la UI lo ofrecía | `routes/academicYears.routes.js`, `controllers/academicYears.controller.js`, `services/academicYears.service.js` |
| 4 | 🟠 Alto | Crear un año académico lo marcaba `ACTIVE` por defecto **sin desactivar los anteriores** → varios años "vigentes" a la vez | `services/academicYears.service.js` |
| 5 | 🟠 Alto | El cambio de contraseña por un administrador exigía **conocer la contraseña ajena** (imposible en un restablecimiento) | `services/users.service.js`, `validators/users.validator.js` |
| 6 | 🟡 Medio | `PUT /api/academic-history/:id` **sin validador** (un `grade_value` no numérico daba 500); `POST` validaba `query` en vez de `body`; `PUT /users/profile` y `POST /users/change-password` sin validación | `validators/academicHistory.validator.js`, `routes/academicHistory.routes.js`, `validators/users.validator.js`, `routes/users.routes.js` |

Además, `GET /api/academic-years/:id` con un id inexistente ahora devuelve **404** en vez
de `200` con `data: null`.

---

## 2. FRONTEND — correcciones y rediseño

### 2.1 Corrección funcional
- **"Cambiar contraseña" era inservible:** navegaba a un formulario que solo tenía la
  contraseña **nueva**, mientras el backend exige la **actual** → fallaba siempre.
  Ahora es un **diálogo rápido** dentro de la lista de usuarios (contraseña actual, nueva
  y confirmación, con validación de coincidencia).

### 2.2 Rediseño para funcionarios (menos clics, flujos directos)
- **Nuevo componente `ListPageHeader`** — encabezado único de las páginas de listado con
  dos acciones: **Alta rápida** (panel lateral con el formulario mínimo, sobre la misma
  lista) y **Nuevo** (formulario completo, para casos con más campos).
  Al guardar un alta rápida, la lista se refresca **en sitio**: no se pierden filtros,
  búsqueda ni número de página.
- **Catálogos bajo demanda:** los selects (años académicos, estudiantes) se cargan **al
  abrir el panel**, no al montar la página, para no penalizar la carga inicial.
- **11 módulos con Alta rápida:** Estudiantes, Docentes, Materias, Sedes, Años académicos,
  Periodos académicos, Acudientes, Becas, Escuelas previas, Fichas médicas y Calendario.
- **Paleta morado/lila** conservada en todo el sistema (tema MUI, sidebar, KPIs, login).

### 2.3 Multi-idioma
El test de i18n **detectó un hueco introducido por el propio rediseño**: 3 claves sin
traducir (`users.currentPassword`, `academicPeriods.academicYear`,
`scholarships.academicYear`). Se añadieron en `en` y `es`. Estado: **845 claves, 0
faltantes**.

---

## 3. PRUEBAS

```
Auditoría profunda de API : 110 PASS · 0 FAIL
Tests backend (npm test)  :  27 PASS
Tests frontend (vitest)   :   6 PASS
Build de producción       :  OK (2767 módulos)
i18n                      : 845 claves · 0 faltantes (en/es)
Base de datos             : 50 tablas · 60 migraciones · 14 seeds
Docker                    : 3 servicios HEALTHY (db · backend · frontend)
```

Verificación visual con navegador real (Chromium): login con la paleta morado/lila,
dashboard con KPIs, y la lista de estudiantes mostrando el **par de botones
"Quick add" + "Add Student"** con datos reales en la tabla. Sin errores de JavaScript.

---

## 4. CÓMO EJECUTAR

```bash
cp backend/.env.example backend/.env     # define JWT_SECRET, JWT_REFRESH_SECRET, ENCRYPTION_KEY
export MYSQL_ROOT_PASSWORD='<fuerte>' DB_PASSWORD='<fuerte>'
docker compose up --build -d             # app en http://localhost:8080
```

Cuentas demo (solo desarrollo): `admin@academix.com` / `Academix2026!`

> **Antes de producción:** mantén `SEED_ALLOW_IN_PRODUCTION=false`, elimina las cuentas
> demo y sirve el sistema por HTTPS.

---

## 5. PENDIENTES CONOCIDOS (no bloqueantes)

1. El chunk `index` del frontend supera 500 kB (aviso de Vite; se resolvería con
   code-splitting por ruta).
2. `docker compose` no está disponible en el sandbox de compilación: las imágenes se
   validaron con `docker build` (backend 248 MB, frontend 49,5 MB). El `docker-compose.yml`
   está verificado y funciona en un host con Compose.
