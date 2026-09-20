#!/usr/bin/env bash
# =============================================================================
# ACADEMIX 2.0 — scripts/init-secrets.sh
#
# Genera TODOS los secretos del proyecto y los escribe DONDE CADA COMPONENTE
# LOS LEE. Es la forma recomendada de configurar el proyecto desde una
# instalación limpia.
#
#   bash scripts/init-secrets.sh            # despliegue real (HTTPS)
#   bash scripts/init-secrets.sh --demo     # demostración sobre HTTP local
#
# Escribe:
#   .env          -> variables que consume docker-compose.yml
#   backend/.env  -> env_file real del contenedor del backend
#
# ¿Por qué en DOS archivos? Compose solo sustituye ${VAR} para las variables
# escritas en el propio docker-compose.yml; el resto las lee la aplicación
# desde `env_file: ./backend/.env`. Un secreto que esté solo en el .env raíz
# NO llega al contenedor.
#
# BASE DE DATOS: el proyecto usa un MySQL/MariaDB NATIVO del anfitrión. Este
# script NO crea la base de datos ni el usuario: eso se hace una vez con
#     sudo mysql < database/init/01-init.sql
# y la contraseña que elijas ahí debe coincidir con DB_PASSWORD.
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

DEMO=0
for arg in "$@"; do
  case "$arg" in
    --demo) DEMO=1 ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "Argumento no reconocido: $arg" >&2; exit 1 ;;
  esac
done

command -v openssl >/dev/null 2>&1 || { echo "Falta el comando 'openssl'." >&2; exit 1; }

rand_hex() { openssl rand -hex 32; }

if [ "$DEMO" -eq 1 ]; then
  COOKIE_SECURE=false
  SEED_ALLOW_IN_PRODUCTION=true
  echo "Modo DEMOSTRACIÓN: cookies sobre HTTP y cuentas demo habilitadas."
else
  COOKIE_SECURE=true
  SEED_ALLOW_IN_PRODUCTION=false
  echo "Modo PRODUCCIÓN: cookies Secure (requiere HTTPS) y cuentas demo bloqueadas."
fi

JWT_SECRET="$(rand_hex)"
JWT_REFRESH_SECRET="$(rand_hex)"
ENCRYPTION_KEY="$(rand_hex)"

# --- Credenciales de la base de datos NATIVA ---------------------------------
# Deben coincidir con las que uses en `database/init/01-init.sql`.
DB_NAME="${DB_NAME:-academix_v2}"
DB_USER="${DB_USER:-ADMIN}"
DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -hex 16)}"
# Host visto DESDE el contenedor del backend (host.docker.internal = anfitrión).
# Este valor va al .env RAÍZ, que es el que consume docker-compose.yml.
DB_HOST="${DB_HOST:-host.docker.internal}"
DB_PORT="${DB_PORT:-3306}"
CORS_ORIGIN="${CORS_ORIGIN:-http://localhost:8080}"
TZ_VALUE="${TZ:-America/Costa_Rica}"

umask 077

cat > "$ROOT/.env" <<EOF
# GENERADO por scripts/init-secrets.sh — NO versionar.
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
CORS_ORIGIN=$CORS_ORIGIN
TZ=$TZ_VALUE
COOKIE_SECURE=$COOKIE_SECURE
SEED_ALLOW_IN_PRODUCTION=$SEED_ALLOW_IN_PRODUCTION
EOF

cat > "$ROOT/backend/.env" <<EOF
# GENERADO por scripts/init-secrets.sh — NO versionar.
NODE_ENV=development
PORT=5050
HOST=0.0.0.0
LOG_LEVEL=info

# Base de datos NATIVA del anfitrión.
# Se usa 127.0.0.1 porque este archivo lo lee el backend ejecutado en la
# PROPIA máquina (desarrollo local). En Docker, docker-compose.yml SOBREESCRIBE
# DB_HOST con el valor del .env raíz (host.docker.internal), que es el que
# necesita el contenedor para salir al anfitrión.
DB_HOST=127.0.0.1
DB_PORT=$DB_PORT
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
DB_POOL_MIN=2
DB_POOL_MAX=10

JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
ENCRYPTION_KEY=$ENCRYPTION_KEY

# 'true' exige HTTPS; un navegador descarta las cookies Secure recibidas por HTTP.
COOKIE_SECURE=$COOKIE_SECURE
ACCESS_TOKEN_COOKIE=accessToken
REFRESH_TOKEN_COOKIE=refreshToken
ACCESS_TOKEN_COOKIE_MAX_AGE=900000
REFRESH_TOKEN_COOKIE_MAX_AGE=604800000

CORS_ORIGIN=$CORS_ORIGIN
TRUST_PROXY=0
SEED_ALLOW_IN_PRODUCTION=$SEED_ALLOW_IN_PRODUCTION
EOF

# --- Ficheros por entorno (desarrollo / test / producción) -------------------
# `backend/src/config/env.js` carga el fichero según NODE_ENV:
#   development -> .env   |   test -> .env.test   |   production -> .env.production
# Generamos los tres para que NINGÚN entorno arranque con secretos vacíos.
cat > "$ROOT/backend/.env.development" <<EOF
# GENERADO por scripts/init-secrets.sh — NO versionar.
NODE_ENV=development
PORT=5050
HOST=0.0.0.0
LOG_LEVEL=debug

DB_HOST=127.0.0.1
DB_PORT=$DB_PORT
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
DB_POOL_MIN=2
DB_POOL_MAX=10

JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

COOKIE_SECURE=false
CORS_ORIGIN=$CORS_ORIGIN
TRUST_PROXY=0
SEED_ALLOW_IN_PRODUCTION=$SEED_ALLOW_IN_PRODUCTION
EOF

cat > "$ROOT/backend/.env.test" <<EOF
# GENERADO por scripts/init-secrets.sh — NO versionar.
NODE_ENV=test
PORT=5050
HOST=0.0.0.0
LOG_LEVEL=error

DB_HOST=127.0.0.1
DB_PORT=$DB_PORT
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
DB_POOL_MIN=1
DB_POOL_MAX=5

JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

COOKIE_SECURE=false
CORS_ORIGIN=$CORS_ORIGIN
TRUST_PROXY=0
SEED_ALLOW_IN_PRODUCTION=false
EOF

cat > "$ROOT/backend/.env.production" <<EOF
# GENERADO por scripts/init-secrets.sh — NO versionar.
NODE_ENV=production
PORT=5050
HOST=0.0.0.0

DB_HOST=127.0.0.1
DB_PORT=$DB_PORT
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME

JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

CORS_ORIGIN=$CORS_ORIGIN
COOKIE_SECURE=$COOKIE_SECURE
TRUST_PROXY=1
SEED_ALLOW_IN_PRODUCTION=false
EOF

chmod 600 "$ROOT/.env" "$ROOT/backend/.env" \
  "$ROOT/backend/.env.development" "$ROOT/backend/.env.test" "$ROOT/backend/.env.production"

cat <<EOF

Listo. Archivos generados (permisos 600, ignorados por git):
  .env
  backend/.env
  backend/.env.development
  backend/.env.test
  backend/.env.production

Contraseña de la BD nativa: $DB_PASSWORD
  ⚠️  Úsala en database/init/01-init.sql y vuelve a ejecutarlo, o crea el
      usuario a mano:
        CREATE USER '$DB_USER'@'%' IDENTIFIED BY '$DB_PASSWORD';
        GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'%';

Siguiente paso:
  1) sudo mysql < database/init/01-init.sql     # MySQL nativo
  2) docker compose up --build -d               # http://localhost:8080
EOF
