/**
 * Lógica PURA de habilitación del envío de la Solicitud_Registro_Broker
 * (Req 3.16, 3.19).
 *
 * Ubicación: junto a la página `registro-broker` del feature `auth`. Es lógica
 * de presentación reutilizable, sin dependencias de Angular ni de `HttpClient`,
 * consumida por `RegistroBrokerComponent` y por la prueba de propiedad
 * (Property 5, tarea 7.6). El backend SIEMPRE revalida (Req 3.23).
 *
 * Todas las funciones son puras, totales y deterministas (preparadas para PBT).
 *
 * Regla (Req 3.19): el botón "Enviar solicitud de registro" se habilita
 * únicamente cuando:
 *   - la sección Información Personal es válida, Y
 *   - la Consulta_SARLAFT finalizó con éxito, Y
 *   - los 4 documentos obligatorios de registro están cargados y son válidos.
 *
 * _Requirements: 3.16, 3.19_
 */

import { DOCUMENTOS_REGISTRO_BROKER } from '../../../../core/models/registro-broker.model';
import type { TipoDocumentoRegistro } from '../../../../core/models/registro-broker.model';

/**
 * Determina si están cargados y válidos EXACTAMENTE los 4 documentos
 * obligatorios de registro (Req 3.16, 3.19).
 *
 * Función pura y total. No depende del orden; verifica que cada tipo definido en
 * `DOCUMENTOS_REGISTRO_BROKER` esté presente en el conjunto de documentos válidos.
 *
 * @param tiposValidos tipos de documento que han sido cargados y validados con éxito.
 * @returns `true` si los 4 documentos obligatorios están cargados y válidos.
 */
export function documentosRegistroCompletos(
  tiposValidos: readonly TipoDocumentoRegistro[],
): boolean {
  const recibidos = new Set<TipoDocumentoRegistro>(tiposValidos);
  return DOCUMENTOS_REGISTRO_BROKER.every((regla) => recibidos.has(regla.tipo));
}

/**
 * Determina si el botón "Enviar solicitud de registro" debe habilitarse
 * (Req 3.19).
 *
 * Función pura y total.
 *
 * @param personalValido validez de la sección Información Personal (Req 3.2–3.5).
 * @param sarlaftExitosa verdadero si la Consulta_SARLAFT finalizó con éxito (Req 3.15).
 * @param tiposDocumentosValidos tipos de documento cargados y validados con éxito.
 * @returns `true` si el envío debe habilitarse.
 */
export function puedeEnviarSolicitud(
  personalValido: boolean,
  sarlaftExitosa: boolean,
  tiposDocumentosValidos: readonly TipoDocumentoRegistro[],
): boolean {
  return (
    personalValido &&
    sarlaftExitosa &&
    documentosRegistroCompletos(tiposDocumentosValidos)
  );
}
