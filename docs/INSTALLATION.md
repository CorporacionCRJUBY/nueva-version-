# ACADEMIX 2.0 — Installation & Setup Guide

## Requirements
- Node.js >= 18.0.0 (recomendado 20+)
- **MySQL >= 8.0 or MariaDB >= 10.5 — NATIVO en el anfitrión** (no en contenedor)
- npm >= 9.0.0
- Docker + Docker Compose v2 (solo para el despliegue con contenedores)

---

## 1 · Instalar y arrancar MySQL nativo

```bash
# Debian/Ubuntu (MariaDB)
sudo apt-get install -y mariadb-server && sudo systemctl enable --now mariadb

# o MySQL Server
sudo apt-get install -y mysql-server && sudo systemctl enable --now mysql

# Comprobar
mysqladmin ping     # -> mysqld is alive
```

---

## 2 · Crear la base de datos y el usuario (una sola vez)

El esquema lo crean las **migraciones** de Knex; este paso solo prepara la base
de datos, el usuario y sus privilegios.

```bash
# Edita database/init/01-init.sql y CAMBIA 'CAMBIA_ESTA_CLAVE'
sudo mysql < database/init/01-init.sql
```

El script es idempotente y crea:

- `academix_v2` con `utf8mb4` / `utf8mb4_unicode_ci`,
- el usuario `ADMIN` para `'localhost'` **y** `'%'` (este último es el que usa el
  contenedor del backend a través de `host.docker.internal`),
- privilegios mínimos, limitados a esa base de datos.

---

## 3 · Instalar dependencias

```bash
cd backend  && npm install
cd ../frontend && npm install
```

---

## 4 · Configurar el entorno

```bash
# Opción A — generar todos los secretos automáticamente
bash scripts/init-secrets.sh --demo      # HTTP local (desarrollo)
bash scripts/init-secrets.sh             # HTTPS (producción)

# Opción B — manual
cp backend/.env.example backend/.env     # editar DB_PASSWORD y JWT_*/ENCRYPTION_KEY
cp .env.docker .env                      # editar DB_PASSWORD (el mismo valor)
```

Valores mínimos en `backend/.env`:

```env
NODE_ENV=development
PORT=5000

# Base de datos NATIVA
DB_HOST=127.0.0.1          # en Docker: host.docker.internal
DB_PORT=3306
DB_USER=ADMIN
DB_PASSWORD=your_password
DB_NAME=academix_v2

# JWT: secreto del access token y secreto APARTE para refresh tokens.
# En producción (NODE_ENV=production) ambos son obligatorios y el servidor
# no arranca si faltan o miden menos de 32 caracteres.
JWT_SECRET=change_me_to_a_long_random_string
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=change_me_to_a_different_long_random_string

# Clave maestra para cifrar en reposo los secretos TOTP del 2FA
# (AES-256-GCM). Generar con:  openssl rand -hex 32
ENCRYPTION_KEY=change_me_to_64_hex_chars

# 'true' EXIGE HTTPS. Un navegador DESCARTA las cookies `Secure` recibidas por
# HTTP: con 'true' sobre HTTP el login devuelve 200 y el usuario no entra.
# El stack de Docker sirve nginx por HTTP -> debe quedar en 'false'.
COOKIE_SECURE=false

# Retención de activity_logs/audit_logs en días. Opcional; default 730.
AUDIT_RETENTION_DAYS=730

# Límite de tamaño para bodies JSON/urlencoded. Opcional; default 1mb.
JSON_BODY_LIMIT=1mb

# SALTOS de proxy de confianza (número, NO booleano). 0 = expuesto
# directamente; 1 = exactamente un reverse-proxy delante (nginx).
TRUST_PROXY=0
```

> ⚠️ Compose solo sustituye `${VAR}` para las variables escritas en el propio
> `docker-compose.yml`; el resto las lee la aplicación desde
> `env_file: ./backend/.env`. Un secreto que esté **solo** en el `.env` raíz no
> llega al contenedor.

---

## 5 · Migraciones y seeds

```bash
cd backend
npm run migrate     # 60 migraciones
npm run seed        # 14 seeds (datos de demostración incluidos)
```

---

## 6 · Arrancar la aplicación

### Desarrollo local (sin Docker)

```bash
# Backend  -> http://localhost:5000
cd backend && npm run dev

# Frontend -> http://localhost:5173   (otra terminal)
cd frontend && npm run dev
```

### Con Docker (backend + frontend; el MySQL sigue siendo nativo)

```bash
docker compose up --build -d
docker compose ps
```

| Servicio | URL |
|---|---|
| Frontend | http://localhost:8080 |
| API | http://localhost:5000/api |
| Health | http://localhost:5000/health/ready |
| Base de datos | `localhost:3306` (MySQL **nativo** del anfitrión) |

El backend espera a la base nativa, ejecuta las migraciones y siembra **solo la
primera vez** (marcador `/data/.seeded` en el volumen `seed_data`).

> El contenedor alcanza el MySQL del anfitrión por `host.docker.internal`,
> resuelto mediante `extra_hosts: ['host.docker.internal:host-gateway']`.
> Verifica que el MySQL escuche en una interfaz accesible desde Docker y que el
> usuario exista también para `'%'`.

---

## 7 · Verificación

```bash
cd backend  && npm test                  # 25 pruebas
cd frontend && npx vitest run            # 6 pruebas
bash qa/api-qa.sh http://localhost:5000  # 79 comprobaciones de la API
```
