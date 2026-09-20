# ACADEMIX 2.0 — Documentación Técnica

**Sistema de Gestión Académica · New Direction Academy**
Año académico 2026-2027 · Idioma por defecto: inglés (EN) · Idiomas soportados: EN / ES

---

## Tabla de contenidos

1. [Descripción general](#1-descripción-general)
2. [Stack tecnológico](#2-stack-tecnológico)
3. [Arquitectura](#3-arquitectura)
4. [Estructura del repositorio](#4-estructura-del-repositorio)
5. [Puesta en marcha](#5-puesta-en-marcha)
6. [Variables de entorno](#6-variables-de-entorno)
7. [Base de datos](#7-base-de-datos)
8. [Backend](#8-backend)
9. [Seguridad](#9-seguridad)
10. [Frontend](#10-frontend)
11. [Sistema de diseño (Tailwind CSS)](#11-sistema-de-diseño-tailwind-css)
12. [Módulos funcionales](#12-módulos-funcionales)
13. [Referencia de API](#13-referencia-de-api)
14. [Reportes, PDF e impresión](#14-reportes-pdf-e-impresión)
15. [Internacionalización](#15-internacionalización)
16. [Pruebas y QA](#16-pruebas-y-qa)
17. [Despliegue y operación](#17-despliegue-y-operación)
18. [Solución de problemas](#18-solución-de-problemas)
19. [Historial de esta versión](#19-historial-de-esta-versión)

---

## 1. Descripción general

ACADEMIX 2.0 es una aplicación web **full-stack** de administración académica para
colegios de Estados Unidos. Cubre el ciclo académico completo: matrícula de
estudiantes, expedientes de docentes, asignaturas y asignaciones, asistencia,
calificaciones con reglas de bloqueo, historial académico, créditos y GPA,
becas, graduación (GRANSIF), centro de reportes con PDF, y un panel de control
del servidor.

**Principios de diseño**

| Principio | Implementación |
|---|---|
| Separación de responsabilidades | Arquitectura en capas: `routes → controller → service → repository → model` |
| Seguridad por defecto | Cookies `httpOnly`, RBAC granular por permiso, validación de entrada, rate limiting, Helmet |
| Trazabilidad | Auditoría de cambios + logs estructurados (Winston) + historial de tokens revocados |
| Internacionalización | `react-i18next` en el frontend, EN por defecto, ES completo |
| Reproducibilidad | Docker Compose con healthchecks y arranque ordenado |
| Accesibilidad | Navegación por teclado, `aria-*`, foco visible, `prefers-reduced-motion` |

---

## 2. Stack tecnológico

**Backend**
- Node.js 20 · Express 4
- MySQL / MariaDB 11
- Knex.js (query builder + migraciones + seeds)
- JWT (access + refresh con rotación y revocación)
- bcrypt · helmet · express-rate-limit · express-validator · winston · pdfkit
- Jest + Supertest

**Frontend**
- React 18 · Vite 8
- **Tailwind CSS 3** (motor de estilos)
- React Router 6
- react-i18next
- Axios
- lucide-react (iconografía)
- Vitest + Testing Library

**Infraestructura**
- Docker · Docker Compose (`db` + `backend` + `frontend`)
- nginx (sirve el SPA y hace proxy de `/api` al backend)

---

## 3. Arquitectura

```
┌──────────────────────────────────────────────────────────────────┐
│                            NAVEGADOR                             │
│  React + Vite + Tailwind CSS   (SPA, rutas protegidas por rol)   │
└───────────────────────────────┬──────────────────────────────────┘
                                │  HTTPS · cookies httpOnly
                                │  (proxy /api vía nginx en prod)
┌───────────────────────────────▼──────────────────────────────────┐
│                        BACKEND — Express                         │
│                                                                  │
│  routes ──► middleware ──► controller ──► service ──► repository  │
│              (auth)        (HTTP)        (reglas)     (SQL/Knex)  │
│              (rbac)                                      │        │
│              (validate)                                  ▼        │
│              (rate limit)                          ┌──────────┐  │
│  jobs programados (bloqueo de notas, archivado,    │  MySQL   │  │
│                   limpieza de tokens, retención)   │ MariaDB  │  │
└────────────────────────────────────────────────────┴──────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

**Flujo de una petición autenticada**

1. `nginx` (o CORS en desarrollo) enruta `/api/*` al backend.
2. `authenticate` valida el JWT de la cookie `accessToken` y carga el usuario
   con sus roles y permisos.
3. `authorize('modulo.accion')` comprueba el permiso concreto.
4. El **validador** normaliza y verifica el cuerpo/query.
5. El **controlador** traduce HTTP ↔ dominio.
6. El **servicio** aplica las reglas de negocio (p. ej. la regla de 24 horas
   para cambiar notas) y el aislamiento por sede.
7. El **repositorio** ejecuta la consulta parametrizada vía Knex.
8. El **manejador de errores** convierte cualquier excepción en una respuesta
   JSON uniforme y la registra.

---

## 4. Estructura del repositorio

```
academix_v5/
├── docker-compose.yml          # Orquestación: db + backend + frontend
├── .env.example                # Variables de Compose (raíz)
├── .gitignore                  # Excluye secretos y artefactos
│
├── backend/
│   ├── Dockerfile              # Multi-stage, usuario no-root, dumb-init
│   ├── docker-entrypoint.sh    # Espera BD → migra → siembra → arranca
│   ├── package.json
│   ├── .env / .env.example
│   ├── src/
│   │   ├── server.js           # Arranque, apagado ordenado, reintentos de BD
│   │   ├── app.js              # Express: middlewares, rutas, health
│   │   ├── config/             # env, database (pool), logger
│   │   ├── routes/             # 33 routers + índice
│   │   ├── controllers/        # Traducción HTTP
│   │   ├── services/           # Reglas de negocio
│   │   ├── repositories/       # Acceso a datos
│   │   ├── models/             # Entidades y constantes
│   │   ├── validators/         # Validación de entrada
│   │   ├── middleware/         # auth, rbac, errores, rate limit, auditoría
│   │   ├── jobs/               # Tareas programadas
│   │   ├── utils/              # cryptoBox, cookies, branchScope, pdf, etc.
│   │   └── i18n/               # Traducciones del backend
│   └── tests/                  # Jest + Supertest
│
├── frontend/
│   ├── Dockerfile              # Vite build → nginx
│   ├── nginx.conf              # SPA fallback + proxy /api + seguridad
│   ├── tailwind.config.js      # ⚙️ Sistema de diseño (tokens)
│   ├── postcss.config.js
│   ├── index.html
│   ├── public/logo.png         # Logo de la marca
│   └── src/
│       ├── main.jsx
│       ├── App.jsx             # Router + proveedores
│       ├── index.css           # Tailwind + capas de componentes
│       ├── ui/                 # cn, sx (puente de estilos), tokens
│       ├── api/                # Clientes HTTP por módulo
│       ├── components/         # DataTable, Logo, PermissionGate, …
│       ├── layouts/            # MainLayout, AuthLayout
│       ├── pages/              # Login, Dashboard, 404, 403, …
│       ├── features/           # Módulos: pages/ + components/ + hooks/
│       ├── context/            # Auth, Language
│       ├── hooks/              # useAuth, usePermission
│       └── i18n/               # locales/en, locales/es
│
├── database/
│   ├── migrations/             # 60 migraciones
│   ├── seeds/                  # 12 seeds
│   ├── init/01-init.sql        # Inicialización del MySQL NATIVO (BD + usuario)
│   └── schema/schema.sql       # Esquema SQL completo de referencia
│
├── docs/                       # Esta documentación
└── qa/
    ├── api-qa.sh               # Suite QA de API end-to-end
    └── api-qa-results.txt      # Resultados de la última ejecución
```

---

## 5. Puesta en marcha

### 5.1 Con Docker (backend + frontend)

> La base de datos es un **MySQL NATIVO del anfitrión**. Compose NO levanta
> ningún contenedor de base de datos: solo `backend` y `frontend`.

```bash
# 0. Base de datos nativa (una sola vez)
sudo mysql < database/init/01-init.sql

# 1. Variables de Compose (credenciales de la BD nativa)
cp .env.docker .env
#    edita .env y define DB_HOST, DB_PASSWORD

# 2. Variables del backend (secretos de la aplicación)
cp backend/.env.example backend/.env
#    edita backend/.env y define:
#      JWT_SECRET, JWT_REFRESH_SECRET, ENCRYPTION_KEY

# 3. Levantar el stack
docker compose up --build -d
```

| Servicio | URL |
|---|---|
| Frontend | http://localhost:8080 |
| API | http://localhost:5050/api |
| Health | http://localhost:5050/health/ready |
| Base de datos | `localhost:3306` |

El backend espera a que la base esté sana, ejecuta migraciones y siembra **solo
la primera vez** (marcador `/data/.seeded` en el volumen `seed_data`).

> Genera `ENCRYPTION_KEY` con: `openssl rand -hex 32`
> Genera los JWT con: `openssl rand -hex 64`

### 5.2 Desarrollo local

```bash
# Base de datos NATIVA del anfitrión (NO un contenedor)
sudo mysql < database/init/01-init.sql
mysql -uADMIN -p -e "CREATE DATABASE IF NOT EXISTS academix_v2 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Backend
cd backend
cp .env.example .env        # ajusta DB_*, JWT_*, ENCRYPTION_KEY
npm install
npm run migrate             # 60 migraciones
npm run seed                # 12 seeds
npm run dev                 # http://localhost:5050

# Frontend (otra terminal)
cd frontend
cp .env.example .env        # VITE_API_URL=http://localhost:5050/api
npm install
npm run dev                 # http://localhost:5173
```

### 5.3 Credenciales sembradas

| Rol | Email | Contraseña |
|---|---|---|
| SUPER_ADMIN | `admin@academix.com` | `Academix2026!` |
| ADMIN | `admin2@academix.com` | `Academix2026!` |
| TEACHER | `maria.gonzalez@academix.com` | `Academix2026!` |

> ⚠️ **Cambia estas contraseñas antes de cualquier despliegue real.**

---

## 6. Variables de entorno

### Backend (`backend/.env`)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `NODE_ENV` | Entorno (`development` / `production` / `test`) | `production` |
| `PORT` | Puerto HTTP | `5000` |
| `DB_HOST` / `DB_PORT` | Host y puerto de la base | `db` / `3306` |
| `DB_USER` / `DB_PASSWORD` | Credenciales de la base | `ADMIN` / `<secreto>` |
| `DB_NAME` | Nombre de la base | `academix_v2` |
| `JWT_SECRET` | Firma del token de acceso | 64 bytes hex |
| `JWT_EXPIRES_IN` | Vida del token de acceso | `15m` |
| `JWT_REFRESH_SECRET` | Firma del token de refresco | 64 bytes hex |
| `ENCRYPTION_KEY` | Clave AES-256-GCM (32 bytes hex) | `openssl rand -hex 32` |
| `CORS_ORIGIN` | Origen permitido | `http://localhost:8080` |
| `AUDIT_RETENTION_DAYS` | Retención de auditoría | `730` |
| `JSON_BODY_LIMIT` | Límite del cuerpo JSON | `2mb` |

> En **producción** el arranque **aborta** si faltan `JWT_SECRET`,
> `ENCRYPTION_KEY`, `DB_PASSWORD` o un `CORS_ORIGIN` real
> (ver `backend/src/config/env.js`). Esto evita desplegar con secretos por
> defecto.

### Frontend (`frontend/.env`)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `VITE_API_URL` | URL base de la API | `/api` (Docker) · `http://localhost:5050/api` (local) |

---

## 7. Base de datos

### 7.1 Características

- **Motor:** MySQL 8 / MariaDB 11 · charset `utf8mb4` · collation `utf8mb4_unicode_ci`
- **60 migraciones** y **12 seeds** en `database/`
- **50+ tablas** con claves foráneas, índices y restricciones de unicidad
- **Borrado lógico** (`deleted_at`) en las entidades académicas, con columnas
  generadas `active_guard` para que la unicidad solo aplique a filas activas

### 7.2 Grupos de tablas

| Grupo | Tablas representativas |
|---|---|
| Identidad y acceso | `users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `refresh_tokens`, `revoked_tokens` |
| Estructura académica | `branches`, `academic_years`, `academic_periods`, `subjects`, `assignments` |
| Personas | `students`, `teachers`, `guardians`, `student_guardians`, `previous_schools`, `medical_records` |
| Operación | `attendance_records`, `grade_records`, `grade_change_requests`, `credits`, `scholarships` |
| Documentos | `documents`, `report_cards`, `transcripts`, `progress_reports`, `academic_history` |
| Graduación | `graduation_records`, `gransif_records` |
| Gobierno | `audit_logs`, `activity_feed`, `settings`, `calendar_events` |

### 7.3 Migraciones y seeds

```bash
cd backend
npm run migrate          # aplica las pendientes
npm run migrate:rollback # revierte la última
npm run seed             # datos iniciales (idempotente vía merge)
```

### 7.4 Nota de QA sobre la migración 060

`060_add_active_uniqueness_grades_attendance.js` fallaba en MariaDB/MySQL con:

```
ER_WRONG_INDEX / "Index ... is needed in a foreign key constraint"
```

**Causa:** la FK de `student_id` no tenía índice propio y MariaDB usaba el
índice único como respaldo; al intentar eliminarlo, la operación se rechaza.

**Corrección:** antes de soltar el índice único se crean los índices dedicados
`idx_grade_records_student_id`, `idx_attendance_records_assignment_id` e
`idx_attendance_records_student_id`. La migración es **idempotente** y
segura de re-ejecutar.

---

## 8. Backend

### 8.1 Capas

| Capa | Responsabilidad | Ejemplo |
|---|---|---|
| `routes` | Declarar endpoints y encadenar middleware | `students.routes.js` |
| `controllers` | Traducir HTTP ↔ dominio, forma de la respuesta | `students.controller.js` |
| `services` | Reglas de negocio, transacciones, permisos de dominio | `grades.service.js` (regla de 24 h) |
| `repositories` | Consultas SQL vía Knex | `students.repository.js` |
| `models` | Entidades, constantes, enums | `grade.constants.js` |
| `validators` | Validación y normalización de entrada | `students.validator.js` |

### 8.2 Módulos (33 routers)

`auth` · `users` · `roles` · `permissions` · `students` · `teachers` ·
`guardians` · `subjects` · `assignments` · `branches` · `academic-years` ·
`academic-periods` · `academic-history` · `attendance` · `grades` ·
`grade-change-requests` · `gpa` · `credits` · `scholarships` ·
`medical-records` · `previous-schools` · `documents` · `calendar` ·
`graduation` · `gransif` · `progress-reports` · `report-cards` ·
`transcripts` · `reports` · `audit` · `activity` · `settings` · `system`

### 8.3 Tareas programadas

| Job | Frecuencia | Función |
|---|---|---|
| Grade Lock | cada 15 min | Bloquea notas fuera de la ventana de edición |
| Report Archive | 2:00 AM | Archiva reportes del periodo |
| Revoked Tokens Cleanup | 3:00 AM | Purga tokens revocados caducados |
| Audit Retention | 4:00 AM | Aplica `AUDIT_RETENTION_DAYS` |

### 8.4 Panel de control del servidor

Módulo `system` (permisos `system.view` / `system.manage`):

| Endpoint | Devuelve |
|---|---|
| `GET /api/system/metrics` | CPU (uso, núcleos, modelo, load average), memoria, disco, uptime, hostname, plataforma, versión de Node, memoria del proceso |
| `GET /api/system/services` | Estado de backend, base de datos y frontend |
| `GET /api/system/logs` | Últimas líneas del log de aplicación |
| `POST /api/system/restart` | Reinicio del servicio indicado |

### 8.5 Apagado ordenado

`server.js` captura `SIGTERM`/`SIGINT` y cierra en orden: detiene los jobs →
deja de aceptar tráfico HTTP → finaliza peticiones en curso → libera el pool de
la base de datos. Imprescindible para no cortar transacciones en un
despliegue rodante.

---

## 9. Seguridad

| Control | Detalle |
|---|---|
| **Cookies `httpOnly`** | Los tokens **nunca** viajan en el cuerpo JSON: se entregan en cookies `httpOnly` + `SameSite` (`strict` en producción). Un XSS no puede leerlos desde `localStorage`. |
| **JWT de acceso corto** | `15m` por defecto, con `refreshToken` rotado y revocable. |
| **Revocación** | Tabla `revoked_tokens` + limpieza diaria programada; el `logout` revoca access y refresh. |
| **2FA / TOTP** | Flujo de dos pasos: `challengeToken` de corta vida + `POST /api/auth/2fa/verify`, con códigos de respaldo. |
| **RBAC granular** | Permisos `modulo.accion` (33 módulos); middleware `authorize()`. |
| **Aislamiento por sede** | `branchScope` valida en la capa de servicio contra `req.user.branches` (no confía en lo que envíe el cliente) y `branchAccess` como defensa en profundidad. |
| **Validación de entrada** | `express-validator` en todos los endpoints de escritura. |
| **Rate limiting** | Global + límite específico en `/api/auth/*` (los health checks están exentos). |
| **Cabeceras** | Helmet: `X-Content-Type-Options`, CSP, `X-Frame-Options`, HSTS. `X-Powered-By` desactivado. |
| **Cifrado en reposo** | AES-256-GCM (`utils/cryptoBox.js`) con `ENCRYPTION_KEY` para datos sensibles. |
| **Auditoría** | `audit_logs` registra usuario, acción, entidad y diferencias. |
| **Contenedores** | Backend corre como usuario **no-root**; `dumb-init` como PID 1. |

---

## 10. Frontend

### 10.1 Enrutado

- `MainLayout` para el área autenticada; `AuthLayout` para login.
- `ProtectedRoute` exige sesión; `PermissionGate` condiciona la UI al permiso.
- Rutas 403 (`/forbidden`) y 404 (`*`).

### 10.2 Estado y datos

- `AuthContext` — sesión, rol, permisos, login/logout/2FA.
- `LanguageContext` — idioma activo y persistencia.
- `axiosClient` — instancia única con interceptor de refresco automático y
  emisión del evento `academix:api-error` que consume `GlobalErrorSnackbar`.

### 10.3 Componentes compartidos

| Componente | Función |
|---|---|
| `DataTable` | Tabla de datos: búsqueda, filtros, orden, selección, acciones por fila, paginación, exportación, estado vacío/carga |
| `Logo` | Marca "New Direction Academy" (usa `public/logo.png`) |
| `GlobalErrorSnackbar` | Notificación global de errores de API |
| `PermissionGate` | Renderizado condicionado por permiso |
| `ConfirmDialog` | Confirmación de acciones destructivas |

---

## 11. Sistema de diseño (Tailwind CSS)

La interfaz se construyó **sobre Tailwind CSS**. Toda la identidad visual vive
en dos archivos, de modo que cambiar un token reestiliza la aplicación completa.

### 11.1 `tailwind.config.js` — tokens

| Grupo | Contenido |
|---|---|
| `colors.brand` | Escala morado académico (`#f7f4fc` → `#261240`) |
| `colors.lilac` | Acento lila (`#d4b3ff`, `#c89aff`, `#b380ff`) |
| `colors.surface` / `canvas` / `ink` | Superficies y jerarquía de texto |
| `colors.success/warning/danger/info` | Estados semánticos |
| `colors.sidebar` | Paleta del navegador lateral |
| `fontFamily` | `display` (Outfit), `body` (Inter), `mono` (JetBrains Mono) |
| `boxShadow` | `sm`, `md`, `lg`, `brand`, `brand-lg` |
| `backgroundImage` | `brand-gradient`, `hero-gradient`, `sidebar-gradient`, `grid-pattern` |
| `keyframes` / `animation` | `fade-in`, `scale-in`, `float-slow`, `orb`, `indeterminate` |

### 11.2 `src/index.css` — capas

- `@layer base` — reset, tipografía, scrollbars, foco visible, `::selection`.
- `@layer components` — clases semánticas reutilizables:
  `.card`, `.btn`/`.btn-primary`/`.btn-secondary`/`.btn-ghost`/`.btn-danger`,
  `.field`/`.field-label`/`.field-error`, `.table-wrap`/`.table-head-cell`/
  `.table-cell`/`.table-row`, `.chip`, `.nav-item`/`.nav-item-active`,
  `.page-header`/`.page-title`, `.stat-card`, `.modal-overlay`/`.modal-panel`,
  `.empty-state`.
- `@layer utilities` — `.gradient-text`, `.gradient-surface`, `.glass-panel`.
- Bloque `@media print` — los informes siempre salen en claro y sin controles.
- Bloque `prefers-reduced-motion` — respeta la preferencia del sistema.

### 11.3 `src/ui/sx.js` — puente de compatibilidad

La aplicación tenía ~850 declaraciones de estilo en la API `sx` de MUI, muchas
dinámicas y con expresiones condicionales. Para migrar sin reescribirlas a mano
(y sin arriesgar regresiones), el codemod
`frontend/scripts/migrate-sx-to-tailwind.mjs` transforma:

```jsx
// antes
<Box sx={{ mb: 2, color: 'primary.main', bgcolor: 'background.paper' }} />

// después
<Box style={sx({ mb: 2, color: 'primary.main', bgcolor: 'background.paper' })} />
```

`sx()` resuelve en tiempo de ejecución:

- atajos de espaciado MUI (`p`, `mb`, `mx`, `gap`…) con escala de **8 px**;
- dimensiones (`width`, `height`, `fontSize`, `top`…) en **píxeles directos**,
  como hace MUI;
- radios con la semántica de `theme.shape.borderRadius`;
- rutas de color del tema (`primary.main`, `text.secondary`, `divider`…);
- arrays de estilos, callbacks (`theme => ({...})`) y objetos responsive
  (`{ xs, sm, md, lg, xl }`), reactivos al viewport mediante
  `subscribeToViewport` (`useSyncExternalStore`).

> Las claves anidadas (`&:hover`, `& svg`) no son válidas en estilos inline y se
> omiten: su equivalente ahora vive en las **clases Tailwind** del design
> system. El resultado abstracto ("hover de las filas de tabla", "foco de los
> campos") se conserva.

### 11.4 Componentes reescritos en Tailwind puro

Estos componentes se migraron sin `sx`, usando exclusivamente clases:

- `layouts/MainLayout.jsx` — shell de la aplicación (AppBar, sidebar
  colapsable con grupos, menús de usuario e idioma, contenido).
- `layouts/AuthLayout.jsx` — panel de marca + formulario.
- `components/DataTable.jsx` — la tabla que consumen ~30 páginas.
- `components/Logo.jsx`, `components/GlobalErrorSnackbar.jsx`
- `pages/Login.jsx`, `pages/NotFound.jsx`, `pages/ForbiddenPage.jsx`

---

## 12. Módulos funcionales

| Módulo | Descripción |
|---|---|
| **Estudiantes** | Expediente completo: datos personales, tutores, documentos, historial médico, colegios previos, historial académico |
| **Docentes** | Expediente, asignaciones por asignatura y periodo |
| **Asignaturas** | Catálogo, carga horaria, relaciones con docentes y secciones |
| **Asistencia** | Registro diario y rejilla mensual, con reportes por estudiante y grupo |
| **Calificaciones** | Registro por tipo de nota, cálculo de promedio, **regla de bloqueo de 24 h** y solicitudes de cambio con aprobación |
| **Créditos y GPA** | Cálculo de créditos por asignatura y GPA ponderado por periodo |
| **Becas** | Asignación, elegibilidad y seguimiento |
| **Graduación / GRANSIF** | Verificación de requisitos y generación de documentos |
| **Centro de reportes** | Report cards, transcripts oficiales, progress reports, RP 26-27, con versionado y archivo |
| **Bitácora (auditoría)** | Consulta de cambios con filtros por usuario, entidad y fecha |
| **Configuración** | Ajustes del sistema, años y periodos académicos, sedes, calendario |
| **Control del servidor** | Métricas, servicios, logs y reinicio (solo administradores) |

---

## 13. Referencia de API

Base: `/api` · Autenticación: cookie `accessToken` (httpOnly) · Formato:
`{ success, data }` o `{ success: false, error: { message, status } }`

### Autenticación

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/auth/login` | Inicia sesión. Si la cuenta tiene 2FA devuelve `{ twoFactorRequired, challengeToken }` |
| `POST` | `/api/auth/2fa/verify` | Segundo paso del login |
| `POST` | `/api/auth/refresh` | Rota la sesión con el refresh token (cookie) |
| `POST` | `/api/auth/logout` | Revoca tokens y limpia cookies |
| `GET` | `/api/auth/me` | Usuario autenticado con roles y permisos |
| `POST` | `/api/auth/2fa/setup` · `/confirm` · `/disable` | Gestión del segundo factor |
| `POST` | `/api/auth/2fa/backup-codes/regenerate` | Regenera códigos de respaldo |

### Recursos académicos

Cada módulo expone el CRUD completo con la misma forma:

```
GET    /api/{recurso}          # listado con filtros, búsqueda y paginación
GET    /api/{recurso}/:id      # detalle
POST   /api/{recurso}          # crear
PUT    /api/{recurso}/:id      # actualizar
DELETE /api/{recurso}/:id      # baja lógica
```

`{recurso}` ∈ `users`, `students`, `teachers`, `guardians`, `subjects`,
`assignments`, `branches`, `academic-years`, `academic-periods`,
`academic-history`, `attendance`, `grades`, `grade-change-requests`, `gpa`,
`credits`, `scholarships`, `medical-records`, `previous-schools`, `documents`,
`calendar`, `graduation`, `gransif`, `progress-reports`, `report-cards`,
`transcripts`, `reports`, `audit`, `activity`, `roles`, `permissions`,
`settings`, `system`.

### Salud

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/health/live` | Liveness (proceso vivo) |
| `GET` | `/health/ready` | Readiness (proceso + base de datos) |

---

## 14. Reportes, PDF e impresión

- **Generación:** `pdfkit` en el backend produce PDFs en streaming
  (`utils/pdf`), sin escribir archivos temporales.
- **Tipos:** report cards, transcripts oficiales, progress reports, RP 26-27 y
  certificados de graduación.
- **Versionado:** cada emisión se archiva con su versión; se puede reimprimir
  una versión anterior.
- **Impresión:** los estilos de impresión están en `src/index.css`
  (`@media print`): fondo blanco, sin controles (`.no-print`), saltos de página
  controlados (`break-inside: avoid`), `thead` repetido por página y márgenes
  `@page: 14mm`.
- **Exportación:** `DataTable` expone `onExport` para volcar el listado.

---

## 15. Internacionalización

- **Motor:** `react-i18next` (frontend) + recursos del backend.
- **Idioma por defecto:** inglés. **Completos:** EN y ES (40+ archivos por
  idioma, organizados por namespace).
- **Selector:** menú de idioma en la barra superior; la elección persiste.
- **Interpolación:** p. ej. `t('auth.brand.rights', { year })`.
- **Backend:** respeta `Accept-Language` en la localización de mensajes.

---

## 16. Pruebas y QA

### 16.1 Suites automatizadas

```bash
# Frontend — build + pruebas unitarias
cd frontend
npm run build          # build de producción (Vite)
npx vitest run         # pruebas de componentes

# Backend — pruebas de integración (Jest + Supertest)
cd backend
npm test
```

### 16.2 Suite QA de API end-to-end

Con el backend en ejecución:

```bash
bash qa/api-qa.sh                       # contra http://localhost:5050
bash qa/api-qa.sh http://otro-host:5050 # contra otro entorno
```

Cubre 11 áreas: salud, autenticación (incluidas cookies `httpOnly` y JWT
manipulado), RBAC, CRUD de 32 módulos, panel de sistema, validación y manejo de
errores, seguridad (cabeceras, inyección SQL, CORS, rate limiting), refresco de
sesión, i18n y cierre de sesión. Escribe el detalle en
`qa/api-qa-results.txt` y devuelve código de salida distinto de cero si algo
falla (apto para CI).

### 16.3 Resultado de la última ejecución

| Suite | Resultado |
|---|---|
| QA de API (end-to-end) | **80/80 PASS** |
| Backend (Jest) | 25 PASS · 2 skipped (requieren base local) |
| Frontend (Vitest) | 6 PASS |
| Build de producción | Correcto |

### 16.4 Defectos encontrados y corregidos en QA

| # | Severidad | Defecto | Corrección |
|---|---|---|---|
| 1 | Alta | Migración 060 fallaba: `DROP INDEX` sobre un índice que respaldaba una FK (`grade_records`, `attendance_records`). Bloqueaba por completo el despliegue. | Se crean los índices dedicados antes de soltar el índice único; migración idempotente. |
| 2 | Alta | Con rol TEACHER, `GET /api/users` y `GET /api/students` devolvían **500** en lugar de **403**: `injectUserBranch` desreferenciaba `req.body` (inexistente en GET). | Guarda defensiva: se normaliza/omite cuando no hay cuerpo. Se restauró el `403` correcto. |
| 3 | Media | No existía `.gitignore` en la raíz: riesgo real de versionar `backend/.env` con `JWT_SECRET`, `ENCRYPTION_KEY` y contraseñas. | `.gitignore` con exclusión explícita de `.env` y artefactos, manteniendo `.env.example`. |
| 4 | Baja | El script de QA no detectaba la cookie real (nombre `accessToken`, línea con prefijo `#HttpOnly_`). | Parser corregido. |

---

## 17. Despliegue y operación

### 17.1 Ciclo de vida

```bash
docker compose up -d --build     # construir y levantar
docker compose ps                # estado y salud
docker compose logs -f backend   # seguimiento de logs
docker compose down              # detener (conserva volúmenes)
docker compose down -v           # detener y borrar datos
```

### 17.2 Volúmenes

| Volumen | Contenido |
|---|---|
| `db_data` | Datos de MariaDB |
| `uploads_data` | Archivos subidos por los usuarios |
| `seed_data` | Marcador `.seeded` (evita re-sembrar) |

### 17.3 Salud de los servicios

- `backend`: `GET /health/ready` (comprueba también la base de datos)
- `frontend`: `GET /healthz` en nginx

El orden de arranque está garantizado con `depends_on: condition: service_healthy`
(el frontend espera al backend). La base de datos es **nativa del anfitrión**, no
un servicio de este compose, así que el backend reintenta la conexión en su
`entrypoint` en lugar de esperar a un contenedor.

### 17.4 Copias de seguridad

La base de datos es NATIVA del anfitrión: se respalda con las herramientas del
propio servidor, sin pasar por Docker.

```bash
mysqldump -uADMIN -p --single-transaction --routines --triggers \
  academix_v2 > backup_$(date +%F).sql
```

Restauración:

```bash
mysql -uADMIN -p academix_v2 < backup.sql
```

### 17.5 Paso a producción

1. Genera secretos reales (`openssl rand -hex 32` / `-hex 64`).
2. Define `NODE_ENV=production` y un `CORS_ORIGIN` con el dominio real.
3. Sirve tras TLS (terminación en un reverse proxy o balanceador).
4. Cambia las contraseñas sembradas y desactiva o elimina las cuentas de demo.
5. Revisa `AUDIT_RETENTION_DAYS` según tu política de retención.
6. No expongas el puerto 3306 públicamente: el **MySQL nativo** está fuera de
   Docker, así que restringe el acceso en el cortafuegos del anfitrión y no lo
   publiques a internet.

---

## 18. Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| El backend no arranca y registra error de configuración | Faltan `JWT_SECRET`, `ENCRYPTION_KEY`, `DB_PASSWORD` o `CORS_ORIGIN` en producción | Complétalos en `backend/.env` |
| `health/ready` devuelve 503 | La base de datos no responde | `docker compose ps`; revisa `db` y las credenciales `DB_*` |
| Login devuelve 429 | Rate limiting activo tras varios intentos fallidos | Espera la ventana o reinicia el backend |
| El frontend muestra el error de red al llamar a la API | `VITE_API_URL` incorrecto o el backend no está en pie | En Docker debe ser `/api` (nginx hace el proxy) |
| `npm ci` falla en la construcción | `package-lock.json` desincronizado con `package.json` | `npm install` en local y vuelve a construir |
| Las rutas profundas dan 404 al recargar | Falta el fallback del SPA | Verifica `try_files $uri $uri/ /index.html` en `nginx.conf` |
| Los informes salen con fondo oscuro al imprimir | Estilos de impresión no aplicados | Revisa el bloque `@media print` de `index.css` y usa `.no-print` en controles |

---

## 19. Historial de esta versión

**Migración a Tailwind CSS, endurecimiento del stack y QA completo**

- **Frontend migrado a Tailwind CSS.** Se incorporaron `tailwind.config.js`
  (sistema de tokens), `postcss.config.js` y un `index.css` reescrito con capas
  `base` / `components` / `utilities`, estilos de impresión y soporte de
  movimiento reducido.
- **Codemod de estilos.** Se migraron **~849 declaraciones `sx` en 80 archivos**
  y **342 iconos** de `@mui/icons-material` a `lucide-react`, manteniendo la
  fidelidad visual mediante el puente `src/ui/sx.js`.
- **Componentes reescritos en Tailwind puro:** `MainLayout`, `AuthLayout`,
  `DataTable`, `Logo`, `GlobalErrorSnackbar`, `Login`, `NotFound`,
  `ForbiddenPage`.
- **Base de datos funcional.** Se levantó MariaDB real, se aplicaron las 60
  migraciones y los 12 seeds, y se corrigió el defecto de la migración 060 que
  impedía el despliegue.
- **Seguridad.** Corrección del 500 → 403 en RBAC; `.gitignore` para impedir la
  fuga de secretos; configuración de Compose sin credenciales embebidas.
- **QA.** Suite end-to-end `qa/api-qa.sh` con **80 comprobaciones en 11 áreas**,
  todas en verde, además de las suites de backend y frontend y el build de
  producción.

---

*Documentación de ACADEMIX 2.0 · New Direction Academy · Año académico 2026-2027*
