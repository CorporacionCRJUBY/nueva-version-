# FILE: frontend/Dockerfile
# Dockerfile multi-stage del frontend ACADEMIX (React + Vite + Tailwind CSS).
# Stage 1: build estático. Stage 2: servido por nginx con proxy al backend.

# ---------- Stage 1: build ----------
FROM node:20-alpine AS build
WORKDIR /app

# Copiar manifiestos para aprovechar la caché
COPY package.json package-lock.json ./
RUN npm ci

# Copiar el código y construir
COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# ---------- Stage 2: nginx ----------
FROM nginx:1.27-alpine AS runner

# Configuración de nginx (SPA + proxy /api al backend)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# El logo de la marca viaja en public/ y se sirve en la raíz del sitio.
# (Vite copia public/* a dist/ durante el build, así que llega en la etapa 1.)

# Copiar el build estático
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]