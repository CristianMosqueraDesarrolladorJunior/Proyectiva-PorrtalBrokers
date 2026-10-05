#!/bin/sh
# Entrypoint del contenedor del frontend.
#
# Resuelve ÚNICAMENTE la variable ${BACKEND_URL} en la plantilla de Nginx (sin tocar
# las variables internas de Nginx como $host o $remote_addr) y arranca el servidor.
set -eu

: "${BACKEND_URL:=http://host.docker.internal:8080}"

echo "[front] Configurando reverse-proxy /api -> ${BACKEND_URL}"

# Sustituye solo BACKEND_URL; el resto de $variables quedan intactas para Nginx.
envsubst '${BACKEND_URL}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

# Arranca Nginx en primer plano (PID 1).
exec nginx -g 'daemon off;'
