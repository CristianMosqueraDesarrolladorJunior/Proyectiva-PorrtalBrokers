/**
 * Lógica PURA del borrador del Nuevo_Negocio (Req 31.9).
 *
 * Ubicación: junto al feature `nuevo-negocio`. Es lógica de presentación reutilizable,
 * sin dependencias de Angular ni de `HttpClient`, consumida por `NuevoNegocioComponent`
 * y por la prueba de propiedad (Property 31, tarea 14.3).
 *
 * "Guardar Borrador" conserva los datos ingresados del Nuevo_Negocio (datos de cliente,
 * parámetros y paso actual) SIN enviar la solicitud al API_Backend. El borrador se
 * mantiene en el estado en memoria del feature; NUNCA se almacena PII ni token en
 * `localStorage`/`sessionStorage` (Req 28.1).
 *
 * Todas las funciones son puras, totales y deterministas: no leen ni escriben estado
 * externo, no mutan sus argumentos y no realizan efectos de red, de modo que el
 * resultado es reproducible (preparado para PBT).
 *
 * Alinea con Property 31 (design.md):
 *   Para todo estado parcial del formulario de Nuevo_Negocio, guardar el borrador
 *   (`BorradorNuevoNegocio`) y recuperarlo produce exactamente los mismos datos
 *   ingresados (datos de cliente, parámetros y paso actual), y la operación de
 *   guardado no dispara el envío de la solicitud al API_Backend.
 *
 * _Requirements: 31.9_
 */

import type {
  BorradorNuevoNegocio,
  DatosClienteNN,
  ParametrosPreciosNN,
} from '../../core/models/nuevo-negocio.model';

/** Estado parcial en captura del formulario de Nuevo_Negocio (Req 31.9). */
export interface EstadoFormularioNN {
  readonly datosCliente: Partial<DatosClienteNN>;
  readonly parametros: Partial<ParametrosPreciosNN>;
  readonly pasoActual: number;
}

/**
 * Crea un `BorradorNuevoNegocio` a partir del estado parcial del formulario (Req 31.9).
 *
 * Copia de forma superficial los datos ingresados y registra el instante de guardado
 * en formato ISO-8601. Función pura: no muta el estado recibido ni realiza efectos.
 *
 * @param estado Estado parcial del formulario (datos de cliente, parámetros y paso).
 * @param guardadoEn Marca de tiempo ISO-8601 del guardado (inyectada para determinismo).
 * @returns Un borrador inmutable con los datos ingresados y la marca de tiempo.
 */
export function guardarBorrador(
  estado: EstadoFormularioNN,
  guardadoEn: string,
): BorradorNuevoNegocio {
  return {
    datosCliente: { ...estado.datosCliente },
    parametros: { ...estado.parametros },
    pasoActual: estado.pasoActual,
    guardadoEn,
  };
}

/**
 * Recupera el estado parcial del formulario a partir de un borrador (Req 31.9).
 *
 * Operación inversa de `guardarBorrador` respecto de los datos ingresados: reconstruye
 * el estado del formulario (datos de cliente, parámetros y paso actual). Función pura:
 * no muta el borrador ni realiza efectos.
 *
 * @param borrador Borrador previamente guardado.
 * @returns El estado parcial del formulario con los datos ingresados.
 */
export function recuperarBorrador(
  borrador: BorradorNuevoNegocio,
): EstadoFormularioNN {
  return {
    datosCliente: { ...borrador.datosCliente },
    parametros: { ...borrador.parametros },
    pasoActual: borrador.pasoActual,
  };
}
