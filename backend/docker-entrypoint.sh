#!/bin/sh
# FILE: backend/docker-entrypoint.sh
# Entrypoint del contenedor del backend ACADEMIX.
#
# Espera a que la base de datos esté lista, ejecuta las migraciones y los
# seeds (solo la primera vez, controlado por una marca en un volumen), y
# arranca el servidor.
#
# Variables de entorno relevantes:
#   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
#   RUN_MIGRATIONS  (default "true")  -> ejecuta knex migrate:latest
#   RUN_SEEDS       (default "true")  -> ejecuta knex seed:run (solo si la BD está vacía)
#   SEED_MARKER     (default "/data/.seeded") -> archivo que marca que ya se sembró

set -e

# La BD es un MySQL/MariaDB NATIVO (instalado en la máquina anfitriona), no un
# contenedor de este compose. Desde el contenedor del backend se alcanza por
# `host.docker.internal` (ver docker-compose.yml -> extra_hosts).
echo "[entrypoint] Esperando a la base de datos NATIVA en ${DB_HOST}:${DB_PORT}..."

# Esperar a que MySQL/MariaDB acepte conexiones (hasta ~60s)
i=0
until nc -z "${DB_HOST}" "${DB_PORT}" 2>/dev/null || [ "$i" -ge 30 ]; do
  echo "[entrypoint] BD no disponible, reintentando en 2s... (${i}/30)"
  i=$((i + 1))
  sleep 2
done

if [ "$i" -ge 30 ]; then
  echo "[entrypoint] ERROR: no se pudo contactar con el MySQL NATIVO en ${DB_HOST}:${DB_PORT}." >&2
  echo "[entrypoint]   · Verifica que el servidor MySQL/MariaDB del host esté ARRANCADO." >&2
  echo "[entrypoint]   · Verifica que escuche en 0.0.0.0 y no solo en 127.0.0.1 (bind-address)." >&2
  echo "[entrypoint]   · En Linux el compose publica host.docker.internal via extra_hosts." >&2
  exit 1
fi

echo "[entrypoint] Base de datos disponible."

# --- Migraciones ---
if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
  echo "[entrypoint] Ejecutando migraciones..."
  npm run migrate
  echo "[entrypoint] Migraciones completadas."
fi

# --- Seeds (solo la primera vez) ---
SEED_MARKER="${SEED_MARKER:-/data/.seeded}"
if [ "${RUN_SEEDS:-1}" = "1" ]; then
  if [ ! -f "$SEED_MARKER" ]; then
    echo "[entrypoint] Ejecutando seeds (primera inicialización)..."
    # FIX (defecto de entrypoint): el marcador se escribía SIEMPRE, incluso si
    # `npm run seed` fallaba (basta un fallo transitorio: la BD nativa aún
    # arrancando, un lock...). Al quedar marcada como sembrada, la inicialización
    # no se reintentaba nunca y la base quedaba a medias de forma permanente.
    # Ahora el marcador solo se escribe si los seeds terminan bien.
    if npm run seed; then
      mkdir -p "$(dirname "$SEED_MARKER")"
      touch "$SEED_MARKER"
      echo "[entrypoint] Seeds completados."
    else
      echo "[entrypoint] WARN: los seeds fallaron; se reintentarán en el próximo arranque." >&2
    fi
  else
    echo "[entrypoint] Seeds ya ejecutados (marcador $SEED_MARKER presente)."
  fi
fi

echo "[entrypoint] Arrancando el servidor..."
exec "$@"