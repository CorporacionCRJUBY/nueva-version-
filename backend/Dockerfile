# FILE: backend/Dockerfile
# Dockerfile multi-stage del backend ACADEMIX (Express + Knex + MySQL/MariaDB).
#
# IMPORTANTE — CONTEXTO DE BUILD:
#   El contexto es la RAÍZ del repositorio (ver `context: .` en
#   docker-compose.yml), no `backend/`. Es necesario porque el backend ejecuta
#   las migraciones y los seeds, que viven en `database/` en la raíz. Todas las
#   rutas COPY llevan por tanto el prefijo `backend/`.
#
# FIX (QA — el build fallaba con "COPY failed: stat app/node_modules"):
#   Version anterior copiaba `package.json` sin prefijo, por lo que con el
#   contexto de la raíz tomaba el package.json raíz (0 dependencias) y `npm ci`
#   no generaba node_modules. Ahora se copia `backend/package*.json`.

# ---------- Stage 1: dependencias de producción ----------
FROM node:20-alpine AS deps
WORKDIR /app

# Manifiestos del backend (contexto = raíz del repo)
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# ---------- Stage 2: imagen final ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# netcat: espera de la BD en el entrypoint · tzdata: zonas horarias correctas
# dumb-init: PID 1 que reenvía señales y evita procesos zombie
RUN apk add --no-cache netcat-openbsd tzdata dumb-init

# Dependencias de producción
COPY --from=deps /app/node_modules ./node_modules

# Manifiestos y código fuente
COPY backend/package.json ./
COPY backend/src ./src

# Utilidades que referencian los scripts npm (verify / lint)
COPY backend/tests ./tests
COPY backend/eslint.config.js ./
COPY backend/smoke-load.js ./

# Migraciones y seeds (viven en la raíz del repo, ya que el contexto es la raíz)
COPY database ./database

# Directorios de trabajo y permisos del entrypoint
RUN mkdir -p /app/uploads /app/logs /data \
    && chmod +x /app/docker-entrypoint.sh 2>/dev/null || true

COPY backend/docker-entrypoint.sh ./
RUN chmod +x /app/docker-entrypoint.sh

# Usuario no root (principio de menor privilegio)
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs \
    && chown -R nodejs:nodejs /app /data
USER nodejs

EXPOSE 5000

# Entrypoint: espera la BD -> migraciones -> seeds (solo la 1ª vez) -> arranca
ENTRYPOINT ["/usr/bin/dumb-init", "--", "/app/docker-entrypoint.sh"]
CMD ["node", "src/server.js"]
