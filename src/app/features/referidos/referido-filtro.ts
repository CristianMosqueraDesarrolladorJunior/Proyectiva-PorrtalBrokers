/**
 * Lógica PURA de filtrado del Estado de referidos (Req 15.5).
 *
 * Ubicación: junto al feature `referidos`. Es lógica de presentación reutilizable,
 * sin dependencias de Angular ni de `HttpClient`, consumida por
 * `EstadoReferidosComponent` y por la prueba de propiedad (Property 12, tarea 12.3).
 *
 * Todas las funciones son puras, totales y deterministas: no leen estado externo.
 *
 * Alinea con Property 12 (design.md):
 *   Para toda lista de referidos y todo filtro (texto o estado), el conjunto de
 *   referidos mostrados contiene únicamente referidos que satisfacen el filtro y
 *   contiene todos los referidos de la lista que lo satisfacen (correcto y
 *   completo, sin pérdidas ni duplicados). El filtrado preserva el orden original.
 *
 * _Requirements: 15.5_
 */

import type { Referido, FiltrosReferidos } from '../../core/services/referidos.service';

/**
 * Normaliza un texto para comparación insensible a mayúsculas/minúsculas y a
 * espacios de los extremos. Función pura y total.
 *
 * @param valor Texto a normalizar.
 * @returns El texto en minúsculas y sin espacios en los extremos.
 */
function normalizar(valor: string): string {
  return valor.trim().toLowerCase();
}

/**
 * Indica si un Referido satisface el criterio de búsqueda por texto (Req 15.5).
 *
 * El texto se compara (insensible a mayúsculas) contra el nombre y el producto
 * del Referido. Un criterio de búsqueda vacío no filtra (todos lo satisfacen).
 * Función pura y total.
 *
 * @param referido Referido a evaluar.
 * @param busqueda Texto de búsqueda (puede ser `undefined` o vacío).
 * @returns `true` si el Referido satisface la búsqueda.
 */
export function coincideBusqueda(referido: Referido, busqueda: string | undefined): boolean {
  if (busqueda === undefined) {
    return true;
  }
  const termino = normalizar(busqueda);
  if (termino.length === 0) {
    return true;
  }
  return (
    normalizar(referido.nombre).includes(termino) ||
    normalizar(referido.producto).includes(termino)
  );
}

/**
 * Indica si un Referido satisface el criterio de estado (Req 15.5).
 *
 * El estado se compara de forma exacta (insensible a mayúsculas). Un criterio de
 * estado vacío no filtra (todos lo satisfacen). Función pura y total.
 *
 * @param referido Referido a evaluar.
 * @param estado Estado a filtrar (puede ser `undefined` o vacío).
 * @returns `true` si el Referido satisface el estado.
 */
export function coincideEstado(referido: Referido, estado: string | undefined): boolean {
  if (estado === undefined) {
    return true;
  }
  const criterio = normalizar(estado);
  if (criterio.length === 0) {
    return true;
  }
  return normalizar(referido.estado) === criterio;
}

/**
 * Indica si un Referido satisface simultáneamente los filtros de búsqueda y estado.
 * Función pura y total.
 *
 * @param referido Referido a evaluar.
 * @param filtros Filtros de búsqueda y estado (ambos opcionales).
 * @returns `true` si el Referido satisface todos los filtros activos.
 */
export function satisfaceFiltros(referido: Referido, filtros: FiltrosReferidos): boolean {
  return (
    coincideBusqueda(referido, filtros.busqueda) && coincideEstado(referido, filtros.estado)
  );
}

/**
 * Filtra una lista de referidos aplicando los filtros de texto y estado (Req 15.5).
 *
 * Devuelve exactamente los referidos de la lista que satisfacen todos los filtros
 * activos, preservando el orden original y sin introducir pérdidas ni duplicados
 * (correcto y completo, Property 12). Cuando no hay filtros activos, devuelve una
 * copia de la lista completa. Función pura y total.
 *
 * @param referidos Lista completa de referidos.
 * @param filtros Filtros de búsqueda y/o estado a aplicar.
 * @returns Nueva lista con los referidos que satisfacen los filtros, en orden original.
 */
export function filtrarReferidos(
  referidos: readonly Referido[],
  filtros: FiltrosReferidos,
): readonly Referido[] {
  return referidos.filter((referido) => satisfaceFiltros(referido, filtros));
}
