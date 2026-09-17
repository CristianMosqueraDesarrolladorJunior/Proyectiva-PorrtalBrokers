/**
 * Lógica PURA de validación del login del Broker (Req 1.4).
 *
 * Ubicación: junto a la página de login del feature `auth`. Es lógica de
 * presentación reutilizable, sin dependencias de Angular ni de `HttpClient`,
 * consumida por `LoginComponent` y por la prueba de propiedad (Property 1,
 * tarea 7.2). El backend SIEMPRE revalida las credenciales (Req 1.5); esta
 * validación es únicamente por UX/fail-fast.
 *
 * Todas las funciones son puras, totales y deterministas: no leen estado
 * externo, de modo que el resultado es reproducible (preparado para PBT).
 *
 * Alinea con Property 1 (design.md):
 *   Para toda cadena de entrada, el validador de cédula la acepta si y solo si
 *   está compuesta únicamente por dígitos y su longitud está entre 6 y 10
 *   caracteres; en cualquier otro caso la rechaza. El validador de contraseña
 *   rechaza toda cadena vacía o compuesta solo por espacios.
 *
 * _Requirements: 1.4_
 */

/** Longitud mínima de la cédula del Broker (Req 1.4). */
export const CEDULA_LONGITUD_MIN = 6;

/** Longitud máxima de la cédula del Broker (Req 1.4). */
export const CEDULA_LONGITUD_MAX = 10;

/** Expresión que acepta únicamente cadenas compuestas por 6 a 10 dígitos (Req 1.4). */
const PATRON_CEDULA = /^\d{6,10}$/;

/** Resultado tipado de la validación del formulario de login. */
export interface ResultadoValidacionLogin {
  /** Verdadero si la cédula cumple el formato de 6 a 10 dígitos (Req 1.4). */
  readonly cedulaValida: boolean;
  /** Verdadero si la contraseña no está vacía ni contiene solo espacios (Req 1.4). */
  readonly passwordValida: boolean;
  /** Verdadero si el formulario completo es válido para enviar la solicitud. */
  readonly formularioValido: boolean;
}

/**
 * Valida el campo cédula del login (Req 1.4).
 *
 * Acepta la cédula si y solo si está compuesta únicamente por dígitos y su
 * longitud está entre 6 y 10 caracteres; en cualquier otro caso la rechaza.
 * Función pura y total.
 *
 * @param cedula Valor ingresado en el campo cédula.
 * @returns `true` si la cédula es válida.
 */
export function esCedulaValida(cedula: string): boolean {
  return PATRON_CEDULA.test(cedula);
}

/**
 * Valida el campo contraseña del login (Req 1.4).
 *
 * Rechaza toda cadena vacía o compuesta únicamente por espacios en blanco.
 * Función pura y total.
 *
 * @param password Valor ingresado en el campo contraseña.
 * @returns `true` si la contraseña no está vacía ni contiene solo espacios.
 */
export function esPasswordValida(password: string): boolean {
  return password.trim().length > 0;
}

/**
 * Valida el formulario de login completo (Req 1.4).
 *
 * El formulario es válido si y solo si la cédula y la contraseña son válidas.
 * Función pura y total.
 *
 * @param cedula Valor del campo cédula.
 * @param password Valor del campo contraseña.
 * @returns Resultado tipado con la validez de cada campo y del formulario.
 */
export function validarLogin(
  cedula: string,
  password: string,
): ResultadoValidacionLogin {
  const cedulaValida = esCedulaValida(cedula);
  const passwordValida = esPasswordValida(password);
  return {
    cedulaValida,
    passwordValida,
    formularioValido: cedulaValida && passwordValida,
  };
}
