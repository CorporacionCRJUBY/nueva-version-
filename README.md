# ACADEMIX 2.0 — New Direction Academy

Sistema de gestión administrativa y académica · año académico 2026-2027

Aplicación web **full stack**: expedientes de estudiantes, asistencia,
calificaciones, boletas, transcripts oficiales, becas, graduación, reportes
institucionales, auditoría y panel de control del servidor.

| Capa | Tecnología |
|---|---|
| Backend | Node.js + Express + MySQL (Knex) |
| Frontend | React + Vite + **Tailwind CSS** (paleta morado / lila) |
| Base de datos | **MySQL nativo** (instalado en el anfitrión, no en contenedor) |
| Contenedores | Docker + Docker Compose (2 servicios: backend y frontend) |
| Idiomas | Inglés (por defecto) y Español |

> **La base de datos NO se ejecuta en Docker.** El proyecto se conecta al
> servidor **MySQL/MariaDB nativo** instalado en la máquina anfitriona. Los
> contenedores son solo para la aplicación: `backend` (API) y `frontend`
> (nginx). El backend alcanza el MySQL del anfitrión por
> `host.docker.internal`.

---

## Requisitos previos

- **Node.js 20+** y npm
- **MySQL 8.x** o **MariaDB 10.4+** instalado y **arrancado** en el anfitrión
- **Docker** y **Docker Compose v2** (solo para el despliegue con contenedores)

### Arrancar el MySQL nativo

```bash
# Debian/Ubuntu (MariaDB)
sudo apt-get install -y mariadb-server && sudo systemctl enable --now mariadb

# o MySQL Server
sudo apt-get install -y mysql-server && sudo systemctl enable --now mysql
```

---

## 1 · Crear la base de datos y el usuario (una sola vez)

El esquema se crea con **migraciones** (Knex); este paso solo prepara la base
de datos, el usuario y sus privilegios.

```bash
# 1) Edita database/init/01-init.sql y CAMBIA la contraseña 'CAMBIA_ESTA_CLAVE'
sudo mysql < database/init/01-init.sql

# 2) Comprueba
mysql -u ADMIN -p -e "SHOW DATABASES LIKE 'academix_v2';"
```

El script (idempotente) crea:

- la base de datos `academix_v2` con `utf8mb4` / `utf8mb4_unicode_ci`,
- el usuario `ADMIN` para `'localhost'` **y** `'%'` (este último es el que usa
  el contenedor del backend a través de `host.docker.internal`),
- privilegios **limitados** a esa base de datos.

---

## 2 · Configurar los secretos

Ningún secreto se versiona. El proyecto solo incluye **plantillas**
(`*.example`):

| Archivo | Para qué sirve |
|---|---|
| `.env.example` | Variables que lee `docker-compose.yml` (host y credenciales de la BD nativa, CORS, cookies). |
| `.env.docker` | Plantilla del `.env` raíz ya preparada para Docker. |
| `backend/.env.example` | Todas las variables del backend, documentadas una a una. |
| `backend/.env.development.example` | Entorno de desarrollo local sin Docker. |
| `backend/.env.production.example` | Entorno de producción (HTTPS obligatorio). |
| `frontend/.env.example` | Variables `VITE_*` del frontend. |
| `frontend/.env.development.example` / `.env.production.example` | Variantes por entorno. |

> ⚠️ Los `.env` reales **nunca** se suben al repositorio: `.gitignore` y
> `.dockerignore` los excluyen y solo dejan pasar las plantillas `*.example`.

### Opción recomendada — generar los secretos automáticamente

```bash
bash scripts/init-secrets.sh          # despliegue real (HTTPS)
bash scripts/init-secrets.sh --demo   # demostración local sobre HTTP
```

El script escribe **`.env`** (raíz) y **`backend/.env`**, e imprime la
contraseña de aplicación que genera. **Úsala también** en
`database/init/01-init.sql` (o crea el usuario a mano con esa contraseña).

Son dos archivos por un detalle importante de Compose: solo se sustituyen las
`${VAR}` escritas en el propio `docker-compose.yml`; el resto las lee la
aplicación desde `env_file`, y esa ruta es `backend/.env`.

### Opción manual

```bash
cp backend/.env.example backend/.env
#    Editar backend/.env: DB_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET, ENCRYPTION_KEY

cp .env.docker .env
#    Editar .env: DB_PASSWORD (el mismo valor) y DB_HOST
```

Los secretos deben tener **32 caracteres o más**; el arranque rechaza los
valores de plantilla. `COOKIE_SECURE=true` exige servir por **HTTPS**: con el
stack de Docker en HTTP debe quedar en `false`, o el navegador descartará la
cookie de sesión y el login parecerá funcionar sin dejar entrar.

---

## 3 · Levantar el proyecto

### Con Docker (backend + frontend; MySQL nativo del anfitrión)

```bash
docker compose up --build -d
docker compose ps
#    Aplicación:  http://localhost:8080
#    Estado:      http://localhost:8080/health/ready   (db: up)
```

Cómo llega el contenedor a la base de datos nativa:

- `DB_HOST=host.docker.internal` (por defecto en `docker-compose.yml`),
- el servicio `backend` declara
  `extra_hosts: ['host.docker.internal:host-gateway']`, necesario en Linux
  (Docker Desktop ya lo resuelve en macOS/Windows),
- el MySQL del anfitrión debe **escuchar en una interfaz accesible desde
  Docker** (`bind-address = 0.0.0.0` o `127.0.0.1` + la ruta
  `host-gateway`), y el usuario existe para `'%'`.

El backend espera a la base de datos, aplica las migraciones y ejecuta los
seeds en el primer arranque (`RUN_MIGRATIONS` / `RUN_SEEDS`).

> ⚠️ **Antes de exponer a producción:** las cuentas demo del seed se bloquean
> automáticamente cuando `NODE_ENV=production`. Mantener
> `SEED_ALLOW_IN_PRODUCTION=false` y **eliminar las cuentas demo** una vez
> creado el usuario administrador real. Servir el sistema por **HTTPS**.

### Desarrollo local (sin Docker)

```bash
# Backend  → http://localhost:5000   (usa el MySQL nativo en 127.0.0.1)
cd backend && cp .env.example .env   # editar DB_PASSWORD y los secretos
npm install && npm run migrate && npm run seed && npm start

# Frontend → http://localhost:5173
cd frontend && cp .env.example .env
npm install && npm run dev
```

---

## Pruebas

```bash
cd backend  && npm test                       # 25 pruebas (2 omitidas sin BD local)
cd frontend && npx vitest run                 # 6 pruebas
bash qa/api-qa.sh http://localhost:5000       # 79 comprobaciones de la API
```

---

## Documentación

| Documento | Contenido |
|---|---|
| [`docs/DOCUMENTATION.md`](docs/DOCUMENTATION.md) | Documentación técnica completa: arquitectura, módulos, API, base de datos, seguridad, Docker, despliegue y registro de correcciones |
| [`docs/INSTALLATION.md`](docs/INSTALLATION.md) | Instalación paso a paso (MySQL nativo y Docker) |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Esquema, migraciones y seeds |
| [`docs/DEMO_ACCOUNTS.md`](docs/DEMO_ACCOUNTS.md) | Cuentas de demostración |
| [`docs/QA_REPORT.md`](docs/QA_REPORT.md) | Reporte de QA: resultados por área, defectos encontrados y recomendaciones de producción |

---

## Estructura

```
backend/    API REST en capas (rutas → controladores → servicios → repositorios)
frontend/   SPA React + Vite + Tailwind (páginas, componentes, sistema de diseño)
database/   Migraciones, seeds, esquema SQL e inicialización de la BD nativa
docs/       Documentación técnica y reporte de QA
qa/         Suite de comprobaciones de la API
scripts/    Utilidades (generación de secretos)
```

---

© New Direction Academy — ACADEMIX 2.0
