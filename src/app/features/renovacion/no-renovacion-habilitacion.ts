/**
 * Lógica PURA de habilitación de la notificación de No Renovación (Req 22.1, 22.3).
 *
 * Ubicación: junto al feature `renovacion`. Es lógica de presentación reutilizable,
 * sin dependencias de Angular ni de `HttpClient`, consumida por
 * `NoRenovacionComponent` y por la prueba de propiedad (Property 29, tarea 13.5).
 * El backend SIEMPRE revalida la No Renovación antes de registrarla (Req 22.2);
 * esta validación es únicamente por UX/fail-fast.
 *
 * Todas las funciones son puras, totales y deterministas: no leen estado externo,
 * de modo que el resultado es reproducible (preparado para PBT).
 *
 * Alinea con Property 29 (design.md):
 *   Para todo `NoRenovacionRequest`, el envío de la no renovación está habilitado
 *   si y solo si se ha seleccionado un motivo del conjunto definido (costo elevado,
 *   cambio de proveedor, ya no necesita la cobertura, insatisfacción con el
 *   servicio); las observaciones son opcionales y no afectan la habilitación.
 *
 * _Requirements: 22.1, 22.3_
 */

import type { MotivoNoRenovacion } from '../../core/models/renovacion.model';

/**
 * Conjunto CERRADO de motivos válidos de No Renovación (Req 22.1).
 *
 * Es la única fuente de verdad de las opciones ofrecidas al Broker; cualquier
 * valor fuera de este conjunto no habilita el envío.
 */
export const MOTIVOS_NO_RENOVACION: readonly MotivoNoRenovacion[] = [
  'costoElevado',
  'cambioProveedor',
  'yaNoNecesita',
  'insatisfaccionServicio',
];

/** Etiqueta legible de cada motivo de No Renovación para la UI (Req 22.1). */
export const ETIQUETA_MOTIVO_NO_RENOVACION: Readonly<Record<MotivoNoRenovacion, string>> = {
  costoElevado: 'Costo elevado',
  cambioProveedor: 'Cambio de proveedor',
  yaNoNecesita: 'Ya no necesita la cobertura',
  insatisfaccionServicio: 'Insatisfacción con el servicio',
};

/**
 * Indica si un valor pertenece al conjunto cerrado de motivos de No Renovación
 * (Req 22.1). Función pura, total y determinista; acepta cualquier cadena o
 * `undefined` para uniformar el tratamiento de la selección aún sin realizar.
 *
 * @param valor Motivo seleccionado (o `undefined`/cadena arbitraria).
 * @returns `true` si el valor es un `MotivoNoRenovacion` del conjunto definido.
 */
export function esMotivoNoRenovacionValido(
  valor: string | undefined,
): valor is MotivoNoRenovacion {
  return valor !== undefined && (MOTIVOS_NO_RENOVACION as readonly string[]).includes(valor);
}

/**
 * Decide si el envío de la No Renovación está habilitado (Req 22.1, 22.3).
 *
 * El envío está habilitado si y solo si se ha seleccionado un motivo del conjunto
 * definido. Las observaciones son opcionales y NO afectan la habilitación.
 * Función pura, total y determinista.
 *
 * @param motivo Motivo seleccionado por el Broker (o `undefined`).
 * @returns `true` si la No Renovación puede enviarse.
 */
export function puedeEnviarNoRenovacion(motivo: string | undefined): boolean {
  return esMotivoNoRenovacionValido(motivo);
}
