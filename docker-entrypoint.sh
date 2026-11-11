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

# Módulos del broker en mejora (solo producción los define). Se limpia a letras y espacios: va dentro de un script.
MODULOS=$(printf '%s' "${MODULOS_EN_MANTENIMIENTO:-}" | tr -cd 'a-z ')
printf 'window.MODULOS_EN_MANTENIMIENTO = "%s";\n' "$MODULOS" > /usr/share/nginx/html/config.js
echo "[front] Módulos en mantenimiento: ${MODULOS:-ninguno}"

# Arranca Nginx en primer plano (PID 1).
exec nginx -g 'daemon off;'
