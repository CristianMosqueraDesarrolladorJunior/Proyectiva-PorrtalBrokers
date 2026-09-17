/**
 * Lógica PURA de validación del paso 1 (Datos cliente) del Nuevo_Negocio (Req 31.2, 31.3).
 *
 * Ubicación: junto al feature `nuevo-negocio`. Es lógica de presentación reutilizable,
 * sin dependencias de Angular ni de `HttpClient`, consumida por `NuevoNegocioComponent`
 * y por la prueba de propiedad (Property 16, tarea 14.2). El backend SIEMPRE revalida
 * la solicitud antes de registrarla (Req 28.6); esta validación es únicamente por
 * UX/fail-fast para habilitar el avance al paso 2.
 *
 * Todas las funciones son puras, totales y deterministas: no leen estado externo,
 * de modo que el resultado es reproducible (preparado para PBT).
 *
 * Alinea con Property 16 (design.md):
 *   Para toda entrada del paso 1 de un Nuevo_Negocio, avanzar al paso 2 está permitido
 *   si y solo si el nombre o razón social, la identificación, el correo electrónico y
 *   el teléfono están diligenciados. La dirección es opcional y no afecta la validez.
 *
 * _Requirements: 31.2, 31.3_
 */

import type { DatosClienteNN } from '../../core/models/nuevo-negocio.model';

/** Resultado tipado de la validación del paso 1 del Nuevo_Negocio (Req 31.3). */
export interface ResultadoValidacionPaso1 {
  /** Verdadero si el nombre o razón social está diligenciado (no vacío tras trim). */
  readonly nombreValido: boolean;
  /** Verdadero si la identificación está diligenciada (no vacía tras trim). */
  readonly identificacionValida: boolean;
  /** Verdadero si el correo electrónico está diligenciado (no vacío tras trim). */
  readonly correoValido: boolean;
  /** Verdadero si el teléfono está diligenciado (no vacío tras trim). */
  readonly telefonoValido: boolean;
  /** Verdadero si el paso 1 completo es válido para avanzar al paso 2. */
  readonly paso1Valido: boolean;
}

/**
 * Indica si un campo de texto está diligenciado (Req 31.3).
 *
 * Un campo se considera diligenciado si y solo si contiene al menos un carácter
 * no vacío tras eliminar espacios en blanco de los extremos. Acepta `undefined`
 * para uniformar el tratamiento de campos capturados y aún no diligenciados.
 * Función pura y total.
 *
 * @param valor Valor del campo (puede ser `undefined`).
 * @returns `true` si el campo contiene texto significativo.
 */
export function campoDiligenciado(valor: string | undefined): boolean {
  return valor !== undefined && valor.trim().length > 0;
}

/**
 * Valida el paso 1 (Datos cliente) del Nuevo_Negocio (Req 31.3).
 *
 * El paso 1 es válido —y por lo tanto se permite avanzar al paso 2— si y solo si
 * el nombre o razón social, la identificación, el correo electrónico y el teléfono
 * están diligenciados. La dirección es opcional y NO afecta la validez.
 * Función pura y total.
 *
 * @param datos Datos del cliente capturados en el paso 1 (campos parciales admitidos).
 * @returns Resultado tipado con la validez de cada campo obligatorio y del paso.
 */
export function validarPaso1(
  datos: Partial<DatosClienteNN>,
): ResultadoValidacionPaso1 {
  const nombreValido = campoDiligenciado(datos.nombreORazonSocial);
  const identificacionValida = campoDiligenciado(datos.identificacion);
  const correoValido = campoDiligenciado(datos.correo);
  const telefonoValido = campoDiligenciado(datos.telefono);
  return {
    nombreValido,
    identificacionValida,
    correoValido,
    telefonoValido,
    paso1Valido:
      nombreValido && identificacionValida && correoValido && telefonoValido,
  };
}
