# ACADEMIX 2.0 — Documentación Técnica Completa

**New Direction Academy** · Año académico 2026-2027
Sistema de gestión administrativa y académica · Full stack

---

## 1. Resumen ejecutivo

ACADEMIX es una aplicación web full stack para la gestión administrativa y
académica de un colegio. Cubre el ciclo completo: expediente del estudiante,
asistencia, calificaciones, boletas, transcripciones oficiales (transcript),
becas, graduación (GRANSIF), reportes institucionales, auditoría y control del
servidor.

| Métrica | Valor |
|---|---|
| Módulos backend | 33 controllers · 36 servicios · 33 repositorios · 34 rutas |
| Módulos frontend | 87 componentes/páginas |
| Base de datos | 60 migraciones · 14 seeds · 50 tablas · utf8mb4 |
| Internacionalización | 41 archivos de traducción por idioma (EN por defecto, ES) |
| Líneas de código | ~18.500 backend · ~22.400 frontend |
| Cobertura de pruebas | 79 comprobaciones de API · 25 tests backend · 6 tests frontend |

---

## 2. Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Backend | Node.js + Express | Node 20 (Alpine) / Express 4 |
| Frontend | React + Vite + **Tailwind CSS** | React 18 / Vite 8 / Tailwind 3.4 |
| Base de datos | MySQL / MariaDB | 10.11 (utf8mb4, InnoDB) |
| Acceso a datos | Knex (query builder + migraciones) | 3.x |
| Autenticación | JWT (access + refresh) en cookies **httpOnly** | — |
| Contenedores | Docker + Docker Compose | 3 servicios |
| Servidor web | nginx (SPA + proxy inverso) | nginx stable-alpine |

---

## 3. Estructura del repositorio

```
academix_v5/
├── backend/                      # API REST (Express)
│   ├── src/
│   │   ├── controllers/          # 33 capas de entrada HTTP
│   │   ├── services/             # 36 reglas de negocio
│   │   ├── repositories/         # 33 acceso a datos (Knex)
│   │   ├── routes/               # 34 definiciones de rutas
│   │   ├── validators/           # 29 esquemas de validación
│   │   ├── middleware/           # 10 (auth, RBAC, errores, límites, sucursal)
│   │   ├── config/               # env, database, knexfile
│   │   └── server.js  app.js     # arranque y composición
│   ├── tests/                    # smoke + health
│   ├── Dockerfile                # multi-stage, usuario no-root
│   └── docker-entrypoint.sh      # espera BD → migra → seeds → arranca
├── frontend/                     # SPA (React + Vite + Tailwind)
│   ├── src/
│   │   ├── pages/                # 40+ páginas de módulos
│   │   ├── components/           # DataTable, Logo, PermissionGate, …
│   │   ├── layouts/              # MainLayout, AuthLayout
│   │   ├── ui/                   # tokens.js, sx.js (puente), cn.js
│   │   ├── i18n/{en,es}/         # 41 archivos por idioma
│   │   └── index.css             # sistema de diseño Tailwind
│   ├── tailwind.config.js        # design system (tokens)
│   ├── postcss.config.js
│   ├── nginx.conf                # SPA + proxy /api + cabeceras de seguridad
│   └── Dockerfile                # build Vite → nginx
├── database/
│   ├── migrations/               # 60 migraciones ordenadas
│   ├── seeds/                    # 14 seeds (datos base + demo)
│   └── init/01-init.sql          # charset y privilegios
├── docs/                         # esta documentación + reporte QA
├── qa/api-qa.sh                  # suite de QA de la API
├── docker-compose.yml            # db + backend + frontend
└── .dockerignore
```

---

## 4. Arquitectura

### 4.1 Capas del backend

El backend aplica una separación estricta en capas; ninguna capa salta a otra:

```
Petición HTTP
   │
   ├─ routes/         define el endpoint y encadena los middlewares
   ├─ middleware/     autenticación → permisos (RBAC) → sucursal → validación
   ├─ validators/     valida y normaliza el cuerpo/consulta (rechaza con 400)
   ├─ controllers/    orquesta: traduce HTTP ⇄ dominio, sin lógica de negocio
   ├─ services/       REGLAS DE NEGOCIO (única capa con lógica)
   └─ repositories/   acceso a datos con Knex (única capa que habla con la BD)
```

**Por qué importa:** las reglas de negocio viven en un solo lugar, lo que las
hace comprobables y reutilizables; la capa de datos es la única que conoce el
esquema, de modo que un cambio de tabla no se propaga por todo el código.

### 4.2 Frontend

React con enrutado por roles. El punto de entrada envuelve la app con:

- `AuthProvider` — sesión, tokens en cookies httpOnly (renovación transparente).
- `LanguageProvider` — i18n EN/ES con `Accept-Language`.
- `ThemeProvider` — tema de la interfaz.
- `ProtectedRoute` — exige sesión; `PermissionGate` — exige permiso concreto.

---

## 5. Seguridad (endurecimiento)

| Control | Implementación |
|---|---|
| Sesiones | JWT de acceso + refresco en cookies **httpOnly** (inmunes a robo por XSS) |
| Rotación de refresco | El refresh token se rota y los revocados se persisten en BD (`revokedTokens`) — sobreviven a reinicios |
| Contraseñas | bcrypt (10 rondas) |
| Bloqueo de cuenta | Tras N intentos fallidos la cuenta se bloquea (`423`), incluso tras reiniciar el servicio |
| Autorización | RBAC granular: 33 módulos × acciones (view/create/edit/delete), roles SUPER_ADMIN / ADMIN / TEACHER |
| Aislamiento por sucursal | Middleware de sucursal que inyecta el ámbito del usuario |
| Límite de peticiones | Autenticación con clave **por cuenta** (no por IP) + límite global |
| Cabeceras | CSP, HSTS (en TLS), X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| Contenedores | Proceso **no-root** + `dumb-init` (manejo correcto de señales) |
| Validación | 29 validadores de entrada; errores normalizados sin filtrar internos |
| Auditoría | Registro de acciones y tokens revocados |

**Decisión de diseño — límites por cuenta, no por IP:** un colegio suele salir a
internet por una única IP pública (NAT). Un límite por IP haría que un solo
usuario bloqueara a todo el centro; por eso el límite de autenticación se aplica
por *cuenta*, y el límite general es holgado (600 req/min).

---

## 6. Base de datos

- **Motor:** MariaDB/MySQL, `utf8mb4` (soporte completo de acentos y emojis) e InnoDB.
- **Migraciones:** 60 archivos ordenados y **idempotentes** (cada uno comprueba
  el estado antes de actuar, por lo que se puede re-ejecutar sin daño).
- **Seeds:** 14 archivos. Las cuentas demo se **bloquean en producción** por
  seguridad (contraseña conocida); se habilitan solo si se define
  `SEED_ALLOW_IN_PRODUCTION=true` (uso exclusivo de demostración).
- **Unicidad activa:** las tablas de calificaciones y asistencia usan una
  columna generada (`active_guard`) para permitir historial sin duplicar el
  registro vigente.

### Levantar la base de datos

```bash
# Con Docker (recomendado)
docker compose up -d db

# Manual
mysql -u root -p -e "CREATE DATABASE academix_v2 CHARACTER SET utf8mb4;"
cd backend && npm run migrate && npm run seed
```

---

## 7. API REST

Prefijo: `/api`. Todas las respuestas siguen el mismo contrato:

```json
{ "success": true,  "data": { … } }
{ "success": false, "error": { "message": "…", "status": 400 } }
```

| Grupo | Base | Descripción |
|---|---|---|
| Autenticación | `/api/auth` | login, logout, refresh, me, 2FA |
| Estudiantes | `/api/students` | expediente, tutores, documentos, historial |
| Docentes | `/api/teachers` | plantilla, asignaciones, materias |
| Asistencia | `/api/attendance` | diaria, rejilla mensual, reportes |
| Calificaciones | `/api/grades` | libro de notas, periodos, cambios (regla de 24 h) |
| Académico | `/api/academic-*` | años, periodos, créditos, GPA, becas |
| Documentos | `/api/reports`, `/api/transcripts` | boletas, progreso, transcript oficial |
| Graduación | `/api/graduation`, `/api/gransif` | centro de graduación, GRANSIF |
| Administración | `/api/users`, `/api/roles`, `/api/permissions` | usuarios, roles, permisos |
| Auditoría | `/api/audit`, `/api/activity` | bitácora y flujo de actividad |
| Sistema | `/api/system` | métricas, servicios, logs, reinicio |

### Endpoints de salud (orquestación)

| Endpoint | Uso |
|---|---|
| `GET /health/live` | *liveness*: el proceso responde |
| `GET /health/ready` | *readiness*: además, la BD responde |

Se usan en los `healthcheck` de Docker Compose para el arranque ordenado.

---

## 8. Frontend: Tailwind CSS

### 8.1 Design system

`tailwind.config.js` define los tokens del sistema (paleta **violeta/morado** de
la identidad ACADEMIX, tipografías, espaciado, sombras, animaciones). Cambiar un
token reestiliza toda la aplicación.

```
brand / lilac   → paleta primaria violeta (marca)
ink / ink-soft  → texto y texto secundario
surface / line  → superficies y bordes
success/warning/danger → estados semánticos
```

`frontend/src/index.css` contiene los estilos base y las utilidades con nombre
(`.btn`, `.nav-item`, `.gradient-text`, …), todos construidos con las directivas
de Tailwind.

### 8.2 Puente de estilos (`src/ui/sx.js`)

Durante la migración a Tailwind, los componentes declaraban estilos con la API
`sx={{ … }}`. En lugar de reescribir a mano ~850 objetos de estilo (y arriesgar
regresiones visuales), se introdujo un **puente en tiempo de ejecución**: una
función que traduce la notación abreviada a propiedades CSS estándar.

```jsx
<Box style={sx({ p: 2, display: 'flex', alignItems: 'center' })} />
```

Esto permitió migrar **todos** los archivos a CSS estándar con una
transformación mecánica verificada por el compilador, preservando el diseño.
Los componentes centrales (`MainLayout`, `AuthLayout`, `DataTable`, `Login`,
`Logo`, `GlobalErrorSnackbar`, páginas 404/403) se reescribieron después en
**Tailwind puro, con clases utilitarias**.

---

## 9. Docker

### 9.1 Servicios

| Servicio | Imagen | Puerto | Notas |
|---|---|---|---|
| `db` | MySQL/MariaDB **NATIVO del anfitrión** | 3306 | no es un contenedor: se alcanza por `host.docker.internal` |
| `backend` | node:20-alpine (multi-stage) | **5000** | no-root, migra y siembra al primer arranque |
| `frontend` | nginx:alpine | **8080** | SPA + proxy `/api` → backend |

Arranque ordenado: el backend espera a que la BD esté *sana*; el frontend espera
a que el backend esté *sano*. Un `entrypoint` reintenta la conexión antes de migrar.

### 9.2 Puesta en marcha

```bash
# 1. Configurar secretos
bash scripts/init-secrets.sh --demo       # o rellena los .env a mano
cp backend/.env.example backend/.env      # editar JWT_SECRET, ENCRYPTION_KEY, etc.
export DB_PASSWORD='...'                  # contraseña del usuario de la BD NATIVA
export DB_HOST='host.docker.internal'     # el anfitrión, visto desde el contenedor

# 2. Levantar
docker compose up --build -d

# 3. Verificar
docker compose ps                          # backend y frontend deben estar "healthy"
curl http://localhost:8080/healthz         # frontend
curl http://localhost:5000/health/ready    # backend + BD nativa
```

Aplicación en **http://localhost:8080**.

### 9.3 Variables principales (`backend/.env.example`)

| Variable | Descripción |
|---|---|
| `NODE_ENV` | `production` en contenedor |
| `DB_HOST/PORT/NAME/USER/PASSWORD` | conexión a la base de datos |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | firmas de los tokens (**obligatorias** en producción) |
| `ENCRYPTION_KEY` | cifrado de datos sensibles (**obligatoria**) |
| `CORS_ORIGIN` | origen permitido (obligatoria en producción) |
| `TRUST_PROXY` | `1` cuando hay un proxy delante (nginx) |
| `RUN_MIGRATIONS` / `RUN_SEEDS` | ejecutar migraciones/seeds al arrancar |
| `RATE_LIMIT_MAX` / `AUTH_RATE_LIMIT_MAX` | límites de peticiones |

En producción, si falta un secreto crítico el arranque **aborta** en lugar de
funcionar de forma insegura.

---

## 10. Puesta en marcha sin Docker (desarrollo)

```bash
# Backend
cd backend && npm install
npm run migrate && npm run seed
npm start                      # http://localhost:5000

# Frontend
cd frontend && npm install
npm run dev                    # http://localhost:5173 (proxy /api al backend)
```

---

## 11. Pruebas

```bash
cd backend  && npm test            # 25 tests (2 omitidos sin BD local)
cd frontend && npx vitest run      # 6 tests
bash qa/api-qa.sh http://localhost:5000   # 79 comprobaciones de API
```

Resultados detallados en `docs/QA_REPORT.md`.

---

## 12. Panel de control del servidor

Ruta `/server-control` (visible con el permiso `system.view` o rol admin).

- **Métricas:** CPU (uso, núcleos, carga), memoria, disco, uptime, host y plataforma.
- **Servicios:** estado de API / base de datos / frontend, con reinicio.
- **Logs:** últimas líneas del registro de la aplicación.
- **Actualización automática** cada 5 s y refresco manual.

El backend obtiene estos datos del sistema operativo del contenedor
(`/api/system/*`), protegido por rol.

---

## 13. Registro de correcciones (QA)

Defectos reales encontrados y corregidos durante la validación:

| # | Problema | Causa | Solución |
|---|---|---|---|
| 1 | Migración 060 fallaba | Una clave foránea usaba el índice único que se pretendía eliminar | Crear los índices de respaldo **antes** de soltar el índice |
| 2 | Backend no arrancaba en Docker | El `Dockerfile` asumía otro contexto de compilación | Dockerfile ajustado al contexto de la raíz |
| 3 | Migraciones no encontraban los archivos en Docker | Rutas relativas resueltas desde `/` en lugar de `/app` | Búsqueda ascendente del directorio raíz del proyecto |
| 4 | El login fallaba **a través de nginx** | `upstream sent too big header` (cookies JWT + cabeceras > buffer de 4 kB) | Ampliado el buffer de cabeceras del proxy |
| 5 | Cabeceras de seguridad ausentes | `add_header` no se hereda si el bloque declara las suyas | Replicadas explícitamente en cada bloque |
| 6 | Página de control del servidor en blanco | Iconos usados sin importar (`DnsIcon`, `CheckCircle`) | Importaciones corregidas |
| 7 | Barras de progreso siempre al 100 % | El componente de progreso no aplicaba su escala | Barras nativas Tailwind con ancho en porcentaje |
| 8 | Desbordamiento horizontal en móvil | El panel lateral ocupaba 264 px de 390 px | Panel lateral colapsado en pantallas pequeñas |
| 9 | Bloqueo de cuentas tras las pruebas | El bloqueo de seguridad persistía | Función de desbloqueo (comportamiento correcto) |
| 10 | Límite de login por IP | Compartido por todo el colegio (NAT) | Límite **por cuenta** |

---

## 14. Glosario

| Término | Significado |
|---|---|
| **RBAC** | Control de acceso basado en roles y permisos |
| **Transcript** | Expediente académico oficial del estudiante |
| **GRANSIF** | Proceso institucional de graduación |
| **Report Card** | Boleta de calificaciones por periodo |
| **GPA** | Promedio de calificaciones ponderado |
| **Liveness / Readiness** | Señales de salud para orquestadores |
| **NAT** | Traducción de direcciones: toda una red sale por una IP |

---

*Documentación generada para ACADEMIX 2.0 — New Direction Academy (2026-2027).*
