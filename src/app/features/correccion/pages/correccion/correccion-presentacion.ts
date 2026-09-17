/**
 * Lógica PURA de presentación de la Corrección de Documentos (Req 32).
 *
 * Sin dependencias de Angular ni de `HttpClient`: funciones puras, totales y
 * deterministas consumidas por `CorreccionComponent`. La validación autoritativa
 * (tipo MIME, tamaño, presencia) SIEMPRE la revalida el API_Backend (Req 32.6);
 * esta lógica es únicamente por UX/fail-fast.
 *
 * Alinea con:
 * - Req 32.1: stepper de 3 pasos (Subir documento → Observaciones → Confirmación)
 *   y resumen del trámite (referencia, documento y motivo de corrección).
 * - Req 32.5: impedir el envío sin un documento corregido cargado.
 */

/** Etiquetas de los 3 pasos del flujo de Corrección de Documentos (Req 32.1). */
export const PASOS_CORRECCION: readonly string[] = [
  'Subir documento',
  'Observaciones',
  'Confirmación',
];

/** Índice del paso "Subir documento" (Req 32.1, 32.2). */
export const PASO_SUBIR_DOCUMENTO = 0;

/** Índice del paso "Observaciones" (Req 32.1, 32.4). */
export const PASO_OBSERVACIONES = 1;

/** Índice del paso "Confirmación" (Req 32.1, 32.6). */
export const PASO_CONFIRMACION = 2;

/**
 * Determina si la corrección puede enviarse (Req 32.5).
 *
 * Solo es posible enviar cuando existe un documento corregido cargado y válido.
 * Las observaciones son opcionales (Req 32.4), por lo que no condicionan el envío.
 *
 * @param documentoCargado `true` si hay un documento corregido válido cargado.
 * @returns `true` si el envío está habilitado.
 */
export function puedeEnviarCorreccion(documentoCargado: boolean): boolean {
  return documentoCargado;
}
