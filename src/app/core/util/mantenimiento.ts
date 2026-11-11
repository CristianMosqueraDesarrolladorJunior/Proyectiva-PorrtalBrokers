/**
 * Módulos del broker en mejora. Los define solo el despliegue de producción (`MODULOS_EN_MANTENIMIENTO` →
 * `config.js`, ver docker-entrypoint.sh); en local la lista llega vacía y todo queda habilitado.
 * «renovaciones» y «comisiones» muestran el aviso; «agente» oculta el Agente IA.
 */
export function enMantenimiento(modulo: string, lista = leerLista()): boolean {
  return lista.split(/\s+/).includes(modulo);
}

function leerLista(): string {
  return (globalThis as { MODULOS_EN_MANTENIMIENTO?: string }).MODULOS_EN_MANTENIMIENTO ?? '';
}
