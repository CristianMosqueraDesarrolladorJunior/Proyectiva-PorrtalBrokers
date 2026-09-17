/**
 * Lógica PURA de cobertura de ciudades por departamento del Cotizador (Req 7.2, 7.3).
 *
 * Ubicación: junto al feature `cotizador`. Es lógica de presentación reutilizable,
 * sin dependencias de Angular ni de `HttpClient`, consumida por `CotizadorComponent`
 * y por la prueba de propiedad (Property 8, tarea 9.4). Las ciudades cubiertas de un
 * departamento se obtienen del API_Backend (`CotizadorService.ciudadesPorDepartamento`,
 * Req 7.2); estas funciones deciden — de forma pura y determinista — si un departamento
 * tiene cobertura y si el cálculo está permitido a partir de la lista recibida.
 *
 * Alinea con Property 8 (design.md):
 *   Para todo departamento con cobertura, todas las ciudades devueltas por el Cotizador
 *   pertenecen a ese departamento; para todo departamento sin ciudades en cobertura, el
 *   Cotizador indica "Ciudad no disponible en cobertura" e impide el cálculo.
 *
 * _Requirements: 7.2, 7.3_
 */

/** Mensaje mostrado cuando el departamento seleccionado no tiene ciudades en cobertura (Req 7.3). */
export const MENSAJE_CIUDAD_SIN_COBERTURA = 'Ciudad no disponible en cobertura';

/** Resultado tipado del estado de cobertura de ciudades de un departamento (Req 7.2, 7.3). */
export interface EstadoCoberturaCiudades {
  /** Verdadero si el departamento tiene al menos una ciudad en cobertura. */
  readonly tieneCobertura: boolean;
  /** Ciudades cubiertas, normalizadas (sin vacías ni duplicadas). */
  readonly ciudades: readonly string[];
  /** Mensaje a mostrar cuando no hay cobertura; cadena vacía cuando sí la hay (Req 7.3). */
  readonly mensaje: string;
}

/**
 * Normaliza la lista de ciudades recibida del backend: descarta entradas vacías o
 * de solo espacios y elimina duplicados preservando el primer orden de aparición.
 * Función pura y total.
 *
 * @param ciudades Lista de ciudades recibida (puede venir con vacíos o duplicados).
 * @returns Lista de ciudades no vacías y sin duplicados.
 */
export function normalizarCiudades(
  ciudades: readonly string[] | null | undefined,
): readonly string[] {
  if (ciudades === null || ciudades === undefined) {
    return [];
  }
  const vistas = new Set<string>();
  const resultado: string[] = [];
  for (const ciudad of ciudades) {
    const nombre = ciudad.trim();
    if (nombre.length === 0 || vistas.has(nombre)) {
      continue;
    }
    vistas.add(nombre);
    resultado.push(nombre);
  }
  return resultado;
}

/**
 * Determina el estado de cobertura de ciudades de un departamento (Req 7.2, 7.3).
 *
 * Un departamento tiene cobertura si y solo si su lista normalizada de ciudades no
 * está vacía. Cuando no tiene cobertura, expone el mensaje "Ciudad no disponible en
 * cobertura" para impedir el cálculo (ver {@link puedeCalcular}).
 * Función pura y total.
 *
 * @param ciudades Ciudades cubiertas del departamento devueltas por el backend.
 * @returns Estado tipado de cobertura del departamento.
 */
export function estadoCobertura(
  ciudades: readonly string[] | null | undefined,
): EstadoCoberturaCiudades {
  const normalizadas = normalizarCiudades(ciudades);
  const tieneCobertura = normalizadas.length > 0;
  return {
    tieneCobertura,
    ciudades: normalizadas,
    mensaje: tieneCobertura ? '' : MENSAJE_CIUDAD_SIN_COBERTURA,
  };
}

/**
 * Indica si una ciudad pertenece a la cobertura del departamento (Req 7.2).
 * Función pura y total.
 *
 * @param ciudad Ciudad seleccionada por el Broker.
 * @param ciudadesCobertura Ciudades cubiertas del departamento.
 * @returns `true` si la ciudad pertenece a la cobertura.
 */
export function ciudadEnCobertura(
  ciudad: string,
  ciudadesCobertura: readonly string[] | null | undefined,
): boolean {
  const nombre = ciudad.trim();
  if (nombre.length === 0) {
    return false;
  }
  return normalizarCiudades(ciudadesCobertura).includes(nombre);
}

/**
 * Decide si el cálculo de la Cotizacion está permitido según la cobertura de
 * ciudades (Req 7.3): solo cuando el departamento tiene cobertura y la ciudad
 * seleccionada pertenece a esa cobertura. Si el departamento no tiene ciudades en
 * cobertura, el cálculo queda impedido.
 * Función pura y total.
 *
 * @param ciudadSeleccionada Ciudad elegida por el Broker.
 * @param ciudadesCobertura Ciudades cubiertas del departamento.
 * @returns `true` si el cálculo puede solicitarse por cobertura de ciudades.
 */
export function puedeCalcular(
  ciudadSeleccionada: string,
  ciudadesCobertura: readonly string[] | null | undefined,
): boolean {
  const estado = estadoCobertura(ciudadesCobertura);
  if (!estado.tieneCobertura) {
    return false;
  }
  return ciudadEnCobertura(ciudadSeleccionada, estado.ciudades);
}
