/**
 * Lógica PURA de validación del login unificado (Req 1.4).
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
 * El usuario inicia sesión con su CÉDULA o con su CORREO:
 *   - La cédula se acepta si y solo si está compuesta únicamente por dígitos y
 *     su longitud está entre 6 y 10 caracteres (Property 1, design.md).
 *   - El correo se acepta si tiene parte local, arroba y dominio con punto,
 *     sin espacios y con máximo 254 caracteres.
 *   El validador de contraseña rechaza toda cadena vacía o solo con espacios.
 *
 * _Requirements: 1.4_
 */

/** Longitud mínima de la cédula del Broker (Req 1.4). */
export const CEDULA_LONGITUD_MIN = 6;

/** Longitud máxima de la cédula del Broker (Req 1.4). */
export const CEDULA_LONGITUD_MAX = 10;

/** Longitud máxima de un correo electrónico (RFC 5321). */
export const USUARIO_LONGITUD_MAX = 254;

/** Expresión que acepta únicamente cadenas compuestas por 6 a 10 dígitos (Req 1.4). */
const PATRON_CEDULA = /^\d{6,10}$/;

/** Correo simple: parte local, arroba y dominio con al menos un punto; sin espacios. */
const PATRON_CORREO = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;

/** Resultado tipado de la validación del formulario de login. */
export interface ResultadoValidacionLogin {
  /** Verdadero si el usuario es una cédula o un correo bien formados (Req 1.4). */
  readonly usuarioValido: boolean;
  /** Verdadero si la contraseña no está vacía ni contiene solo espacios (Req 1.4). */
  readonly passwordValida: boolean;
  /** Verdadero si el formulario completo es válido para enviar la solicitud. */
  readonly formularioValido: boolean;
}

/**
 * Valida una cédula (Req 1.4).
 *
 * Acepta la cédula si y solo si está compuesta únicamente por dígitos y su
 * longitud está entre 6 y 10 caracteres; en cualquier otro caso la rechaza.
 * Función pura y total.
 *
 * @param cedula Valor ingresado.
 * @returns `true` si la cédula es válida.
 */
export function esCedulaValida(cedula: string): boolean {
  return PATRON_CEDULA.test(cedula);
}

/**
 * Valida un correo electrónico. Función pura y total.
 *
 * @param correo Valor ingresado.
 * @returns `true` si el correo está bien formado y no supera 254 caracteres.
 */
export function esCorreoValido(correo: string): boolean {
  return correo.length <= USUARIO_LONGITUD_MAX && PATRON_CORREO.test(correo);
}

/**
 * Valida el campo usuario del login: cédula o correo. Los espacios de los
 * extremos se ignoran (el backend también los recorta). Función pura y total.
 *
 * @param usuario Valor ingresado en el campo usuario.
 * @returns `true` si es una cédula o un correo válidos.
 */
export function esUsuarioValido(usuario: string): boolean {
  const limpio = usuario.trim();
  return esCedulaValida(limpio) || esCorreoValido(limpio);
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
 * El formulario es válido si y solo si el usuario (cédula o correo) y la
 * contraseña son válidos. Función pura y total.
 *
 * @param usuario Valor del campo usuario.
 * @param password Valor del campo contraseña.
 * @returns Resultado tipado con la validez de cada campo y del formulario.
 */
export function validarLogin(
  usuario: string,
  password: string,
): ResultadoValidacionLogin {
  const usuarioValido = esUsuarioValido(usuario);
  const passwordValida = esPasswordValida(password);
  return {
    usuarioValido,
    passwordValida,
    formularioValido: usuarioValido && passwordValida,
  };
}
