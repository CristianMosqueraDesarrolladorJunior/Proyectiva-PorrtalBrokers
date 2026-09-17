/**
 * Lógica PURA de habilitación del Caso Especial de renovación (Req 23.1, 23.2, 23.3).
 *
 * Ubicación: junto al feature `renovacion`. Es lógica de presentación reutilizable,
 * sin dependencias de Angular ni de `HttpClient`, consumida por
 * `CasoEspecialComponent`. El backend SIEMPRE revalida el Caso Especial antes de
 * registrarlo (Req 23.3); esta validación es únicamente por UX/fail-fast.
 *
 * Todas las funciones son puras, totales y deterministas: no leen estado externo,
 * de modo que el resultado es reproducible.
 *
 * Un Caso Especial se puede enviar si y solo si se ha seleccionado un tipo de
 * trámite del conjunto definido (Otro Sí / Cesión de Contrato) y el documento legal
 * en PDF supera las validaciones de MIME, extensión y tamaño (Req 13, Req 23.1, 23.2).
 * Las observaciones son opcionales y no afectan la habilitación.
 *
 * _Requirements: 23.1, 23.2, 23.3_
 */

import type { DocumentoCargado } from '../../core/models/documento.model';
import type { TipoCasoEspecial } from '../../core/models/renovacion.model';
import {
  LIMITE_TAMANO_GENERAL_BYTES,
  validarDocumento,
  type ReglaValidacionDocumento,
} from '../../shared/validation/documento-validacion';

/**
 * Conjunto CERRADO de tipos válidos de Caso Especial (Req 23).
 *
 * Es la única fuente de verdad de las opciones ofrecidas al Broker; cualquier
 * valor fuera de este conjunto no habilita el envío.
 */
export const TIPOS_CASO_ESPECIAL: readonly TipoCasoEspecial[] = ['otroSi', 'cesionContrato'];

/** Etiqueta legible de cada tipo de Caso Especial para la UI (Req 23). */
export const ETIQUETA_TIPO_CASO_ESPECIAL: Readonly<Record<TipoCasoEspecial, string>> = {
  otroSi: 'Otro Sí',
  cesionContrato: 'Cesión de contrato',
};

/**
 * Regla de validación del documento legal del Caso Especial (Req 23.1, 23.2).
 * Solo PDF, límite general de tamaño (10 MB) y sin exigencia de vigencia.
 * El backend revalida (Req 23.3).
 */
export const REGLA_DOCUMENTO_CASO_ESPECIAL: ReglaValidacionDocumento = {
  mimePermitidos: ['application/pdf'],
  tamanoMaxBytes: LIMITE_TAMANO_GENERAL_BYTES,
  vigenciaMaxDias: null,
};

/**
 * Indica si un valor pertenece al conjunto cerrado de tipos de Caso Especial
 * (Req 23). Función pura, total y determinista; acepta cualquier cadena o
 * `undefined` para uniformar el tratamiento de la selección aún sin realizar.
 *
 * @param valor Tipo seleccionado (o `undefined`/cadena arbitraria).
 * @returns `true` si el valor es un `TipoCasoEspecial` del conjunto definido.
 */
export function esTipoCasoEspecialValido(valor: string | undefined): valor is TipoCasoEspecial {
  return valor !== undefined && (TIPOS_CASO_ESPECIAL as readonly string[]).includes(valor);
}

/**
 * Decide si el envío del Caso Especial está habilitado (Req 23.1, 23.2, 23.3).
 *
 * El envío está habilitado si y solo si se ha seleccionado un tipo del conjunto
 * definido Y el documento legal PDF es válido (MIME, extensión y tamaño). Las
 * observaciones son opcionales y NO afectan la habilitación. Función pura, total
 * y determinista.
 *
 * @param tipo Tipo de trámite seleccionado por el Broker (o `undefined`).
 * @param documento Documento legal cargado (o `undefined` si aún no se carga).
 * @returns `true` si el Caso Especial puede enviarse.
 */
export function puedeEnviarCasoEspecial(
  tipo: string | undefined,
  documento: DocumentoCargado | undefined,
): boolean {
  if (!esTipoCasoEspecialValido(tipo) || documento === undefined) {
    return false;
  }
  // La fecha de referencia no afecta la validez porque la regla no exige vigencia.
  return validarDocumento(documento, REGLA_DOCUMENTO_CASO_ESPECIAL, documento.fechaEmision ?? '')
    .valido;
}
