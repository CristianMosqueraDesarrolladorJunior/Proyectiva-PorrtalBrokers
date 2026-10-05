# ============================================================================
# Dockerfile del FRONTEND (Angular 19) — portal-brokers.
#
# Multi-stage: compila el bundle de producción con Node 20 (LTS) y lo sirve con
# Nginx, que además hace de reverse-proxy de `/api` hacia el backend. El destino
# del backend es configurable por la variable de entorno BACKEND_URL (resuelta en
# el arranque con envsubst), sin reconstruir la imagen.
#
# Build:  docker build -t portal-brokers-front .
# Run:    docker run -p 4200:8080 -e BACKEND_URL=http://host.docker.internal:8080 portal-brokers-front
# ============================================================================

# ---- Stage 1: build del bundle Angular ----
FROM node:20-alpine AS build
WORKDIR /src

# Instala dependencias con el lockfile (reproducible). El .npmrc del repo queda
# excluido por .dockerignore, por lo que npm usa el registro público por defecto.
COPY package.json package-lock.json ./
RUN npm ci

# Copia el resto del código y compila en modo producción.
COPY . .
RUN npm run build -- --configuration production

# ---- Stage 2: runtime con Nginx ----
FROM nginx:1.27-alpine AS runtime

# Plantilla de Nginx (se resuelve con envsubst en el arranque) y entrypoint.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.sh /docker-entrypoint-front.sh
RUN chmod +x /docker-entrypoint-front.sh

# Bundle del navegador generado por el builder `application` de Angular.
COPY --from=build /src/dist/portal-brokers/browser /usr/share/nginx/html

# Destino del backend por defecto (sobrescribible en runtime con -e BACKEND_URL=...).
ENV BACKEND_URL=http://host.docker.internal:8080

EXPOSE 8080
ENTRYPOINT ["/docker-entrypoint-front.sh"]
