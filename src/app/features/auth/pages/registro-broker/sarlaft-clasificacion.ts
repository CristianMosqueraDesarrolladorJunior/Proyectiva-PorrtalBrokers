/**
 * Lógica PURA de clasificación SARLAFT por antigüedad de la fecha de expedición
 * y habilitación del botón "Consultar" (Req 3.9, 3.10, 3.11, 3.12, 3.13).
 *
 * Ubicación: junto a la página `registro-broker` del feature `auth`. Es lógica
 * de presentación reutilizable, sin dependencias de Angular ni de `HttpClient`,
 * consumida por `RegistroBrokerComponent` y por la prueba de propiedad
 * (Property 3, tarea 7.5). El backend es la fuente autoritativa del resultado
 * de la Consulta_SARLAFT (Req 3.23); esta clasificación es únicamente por UX.
 *
 * Todas las funciones son puras, totales y deterministas: la "fecha de hoy" se
 * recibe SIEMPRE como parámetro explícito; no se lee el reloj del sistema, de
 * modo que el resultado es reproducible (preparado para PBT).
 *
 * Reglas de clasificación por antigüedad (Req 3.9–3.11):
 *   - antigüedad < 2.5 años                    → 'exito'      (verde)
 *   - 2.5 años ≤ antigüedad < 3 años           → 'advertencia' (naranja)
 *   - antigüedad ≥ 3 años                      → 'error'      (rojo)
 *
 * _Requirements: 3.9, 3.10, 3.11, 3.12, 3.13_
 */

import type { NivelSarlaft } from '../../../../core/models/registro-broker.model';

/** Umbral inferior de advertencia: 2.5 años en días (365 * 2.5 = 912.5 → 912.5). */
export const UMBRAL_ADVERTENCIA_ANIOS = 2.5;

/** Umbral de error: 3 años (Req 3.11, 3.13). */
export const UMBRAL_ERROR_ANIOS = 3;

/** Días promedio por año usados para convertir antigüedad a años (año juliano). */
export const DIAS_POR_ANIO = 365.25;

/** Mensaje de la alerta SARLAFT de éxito (verde) (Req 3.9). */
export const MENSAJE_SARLAFT_EXITO =
  'El SARLAFT está dentro de los tiempos establecidos';

/** Mensaje de la alerta SARLAFT de advertencia (naranja) (Req 3.10). */
export const MENSAJE_SARLAFT_ADVERTENCIA =
  'Recuerde que su SARLAFT debe tener una actualización menor a 3 años';

/** Mensaje de la alerta SARLAFT de error (rojo) (Req 3.11). */
export const MENSAJE_SARLAFT_ERROR =
  'La fecha de expedición supera los 3 años permitidos y no cumple con lo requerido';

/** Clasificación SARLAFT resultante (nivel + mensaje) (Req 3.9–3.11). */
export interface ClasificacionSarlaft {
  readonly nivel: NivelSarlaft;
  readonly mensaje: string;
  /** Antigüedad calculada en años (redondeada al calcular; útil para trazas/UI). */
  readonly antiguedadAnios: number;
}

/**
 * Calcula la antigüedad en años entre la fecha de expedición y la fecha de
 * referencia ("hoy"). Devuelve `null` si alguna fecha no es válida o si la
 * expedición es futura respecto a la referencia.
 *
 * Función pura y total: `hoy` se recibe como parámetro; no se lee el reloj.
 *
 * @param fechaExpedicionIso fecha de expedición ISO-8601.
 * @param hoyIso fecha de referencia ISO-8601.
 * @returns antigüedad en años (≥ 0) o `null` si las fechas no son válidas.
 */
export function antiguedadEnAnios(
  fechaExpedicionIso: string,
  hoyIso: string,
): number | null {
  const expedicion = Date.parse(fechaExpedicionIso);
  const hoy = Date.parse(hoyIso);
  if (Number.isNaN(expedicion) || Number.isNaN(hoy)) {
    return null;
  }
  const msPorDia = 86_400_000;
  const dias = Math.floor((hoy - expedicion) / msPorDia);
  if (dias < 0) {
    return null;
  }
  return dias / DIAS_POR_ANIO;
}

/**
 * Clasifica la fecha de expedición según su antigüedad (Req 3.9–3.11).
 *
 * Devuelve `null` cuando la fecha no es válida o es futura (sin clasificación).
 * Función pura, total y determinista.
 *
 * @param fechaExpedicionIso fecha de expedición ISO-8601.
 * @param hoyIso fecha de referencia ISO-8601 usada para el cálculo de antigüedad.
 * @returns la clasificación SARLAFT (nivel y mensaje) o `null` si no es válida.
 */
export function clasificarSarlaft(
  fechaExpedicionIso: string,
  hoyIso: string,
): ClasificacionSarlaft | null {
  const anios = antiguedadEnAnios(fechaExpedicionIso, hoyIso);
  if (anios === null) {
    return null;
  }
  if (anios >= UMBRAL_ERROR_ANIOS) {
    return {
      nivel: 'error',
      mensaje: MENSAJE_SARLAFT_ERROR,
      antiguedadAnios: anios,
    };
  }
  if (anios >= UMBRAL_ADVERTENCIA_ANIOS) {
    return {
      nivel: 'advertencia',
      mensaje: MENSAJE_SARLAFT_ADVERTENCIA,
      antiguedadAnios: anios,
    };
  }
  return {
    nivel: 'exito',
    mensaje: MENSAJE_SARLAFT_EXITO,
    antiguedadAnios: anios,
  };
}

/**
 * Determina si el botón "Consultar" de la Consulta SARLAFT debe habilitarse
 * (Req 3.12, 3.13).
 *
 * El botón se habilita si y solo si:
 *   - el formulario SARLAFT (documento + fecha) es válido, Y
 *   - existe una clasificación (fecha válida y no futura), Y
 *   - la clasificación NO es de nivel 'error' (antigüedad < 3 años).
 *
 * De este modo, una antigüedad ≥ 3 años impide la Consulta_SARLAFT (Req 3.13).
 * Función pura y total.
 *
 * @param sarlaftFormValido validez del formulario SARLAFT (documento + fecha).
 * @param clasificacion clasificación SARLAFT calculada, o `null` si no aplica.
 * @returns `true` si el botón "Consultar" debe habilitarse.
 */
export function puedeConsultarSarlaft(
  sarlaftFormValido: boolean,
  clasificacion: ClasificacionSarlaft | null,
): boolean {
  if (!sarlaftFormValido) {
    return false;
  }
  if (clasificacion === null) {
    return false;
  }
  return clasificacion.nivel !== 'error';
}
