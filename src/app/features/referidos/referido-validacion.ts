/**
 * Lógica PURA de validación del formulario de Referido (Req 15.1, 15.2).
 *
 * Ubicación: junto al feature `referidos`. Es lógica de presentación reutilizable,
 * sin dependencias de Angular ni de `HttpClient`, consumida por `ReferirComponent`
 * y por la prueba de propiedad (Property 11, tarea 12.2). El backend SIEMPRE
 * revalida el Referido antes de registrarlo (Req 15.3); esta validación es
 * únicamente por UX/fail-fast.
 *
 * Todas las funciones son puras, totales y deterministas: no leen estado externo,
 * de modo que el resultado es reproducible (preparado para PBT).
 *
 * Alinea con Property 11 (design.md):
 *   Para toda entrada de un Referido, el formulario es válido si y solo si el
 *   nombre, la cédula, el celular y el producto de interés están diligenciados;
 *   el correo electrónico y el comentario son opcionales y no afectan la validez.
 *
 * _Requirements: 15.1, 15.2_
 */

import type { ReferidoRequest } from '../../core/services/referidos.service';

/** Resultado tipado de la validación del formulario de Referido (Req 15.2). */
export interface ResultadoValidacionReferido {
  /** Verdadero si el nombre completo está diligenciado (no vacío tras trim). */
  readonly nombreValido: boolean;
  /** Verdadero si la cédula está diligenciada (no vacía tras trim). */
  readonly cedulaValida: boolean;
  /** Verdadero si el celular está diligenciado (no vacío tras trim). */
  readonly celularValido: boolean;
  /** Verdadero si el producto de interés está diligenciado (no vacío tras trim). */
  readonly productoValido: boolean;
  /** Verdadero si el formulario completo es válido para enviar el Referido. */
  readonly formularioValido: boolean;
}

/**
 * Indica si un campo de texto está diligenciado (Req 15.2).
 *
 * Un campo se considera diligenciado si y solo si contiene al menos un carácter
 * no vacío tras eliminar espacios en blanco de los extremos. Acepta `undefined`
 * para uniformar el tratamiento de campos opcionales y obligatorios.
 * Función pura y total.
 *
 * @param valor Valor del campo (puede ser `undefined`).
 * @returns `true` si el campo contiene texto significativo.
 */
export function campoDiligenciado(valor: string | undefined): boolean {
  return valor !== undefined && valor.trim().length > 0;
}

/**
 * Valida el formulario de Referido (Req 15.2).
 *
 * El formulario es válido si y solo si el nombre, la cédula, el celular y el
 * producto de interés están diligenciados. El correo y el comentario son
 * opcionales y NO afectan la validez.
 * Función pura y total.
 *
 * @param referido Datos capturados del Referido.
 * @returns Resultado tipado con la validez de cada campo obligatorio y del formulario.
 */
export function validarReferido(
  referido: Pick<ReferidoRequest, 'nombre' | 'cedula' | 'celular' | 'producto'>,
): ResultadoValidacionReferido {
  const nombreValido = campoDiligenciado(referido.nombre);
  const cedulaValida = campoDiligenciado(referido.cedula);
  const celularValido = campoDiligenciado(referido.celular);
  const productoValido = campoDiligenciado(referido.producto);
  return {
    nombreValido,
    cedulaValida,
    celularValido,
    productoValido,
    formularioValido: nombreValido && cedulaValida && celularValido && productoValido,
  };
}
