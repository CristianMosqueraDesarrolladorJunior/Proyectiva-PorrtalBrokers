/**
 * Lógica PURA de validación de la sección "Información Personal" de la
 * Solicitud_Registro_Broker (Req 3.2, 3.3, 3.4, 3.5, 3.7, 3.8).
 *
 * Ubicación: junto a la página `registro-broker` del feature `auth`. Es lógica
 * de presentación reutilizable, sin dependencias de Angular ni de `HttpClient`,
 * consumida por `RegistroBrokerComponent` y por la prueba de propiedad
 * (Property 2, tarea 7.4). El backend SIEMPRE revalida (Req 3.23); esta
 * validación es únicamente por UX/fail-fast.
 *
 * Todas las funciones son puras, totales y deterministas: no leen estado externo
 * ni el reloj del sistema, de modo que el resultado es reproducible (preparado
 * para PBT).
 *
 * _Requirements: 3.2, 3.3, 3.4, 3.5, 3.7, 3.8_
 */

/** Longitud mínima del nombre completo del aspirante (Req 3.2). */
export const NOMBRE_LONGITUD_MIN = 3;

/** Longitud mínima del número de documento (Req 3.7). */
export const DOCUMENTO_LONGITUD_MIN = 6;

/** Longitud máxima del número de documento (Req 3.7). */
export const DOCUMENTO_LONGITUD_MAX = 12;

/** Longitud mínima del número de teléfono (Req 3.4). */
export const TELEFONO_LONGITUD_MIN = 7;

/** Longitud máxima del número de teléfono (Req 3.4). */
export const TELEFONO_LONGITUD_MAX = 10;

/**
 * Código de país por defecto del selector de teléfono: +57 (Colombia) (Req 3.4).
 */
export const CODIGO_PAIS_DEFECTO = '+57';

/**
 * Códigos de país permitidos en el selector de teléfono (Req 3.4).
 * +57 por defecto más las 9 opciones definidas. Allowlist estricta.
 */
export const CODIGOS_PAIS_PERMITIDOS: readonly string[] = [
  '+57',
  '+1',
  '+52',
  '+54',
  '+56',
  '+51',
  '+593',
  '+58',
  '+55',
  '+507',
];

/** Ciudades permitidas en el selector obligatorio de ciudad (Req 3.5). Allowlist estricta. */
export const CIUDADES_PERMITIDAS: readonly string[] = [
  'Bogotá',
  'Medellín',
  'Cali',
  'Barranquilla',
  'Cartagena',
  'Bucaramanga',
  'Pereira',
  'Santa Marta',
  'Manizales',
  'Cúcuta',
  'Ibagué',
  'Villavicencio',
  'Armenia',
  'Pasto',
  'Montería',
];

/** Acepta únicamente teléfonos compuestos por 7 a 10 dígitos (Req 3.4). */
const PATRON_TELEFONO = /^\d{7,10}$/;

/** Acepta únicamente documentos compuestos por 6 a 12 dígitos (Req 3.7). */
const PATRON_DOCUMENTO = /^\d{6,12}$/;

/**
 * Patrón de correo electrónico válido (Req 3.3).
 * Formato general `local@dominio.tld`, sin espacios, con al menos un punto en el dominio.
 */
const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Resultado tipado de la validación de la sección Información Personal. */
export interface ResultadoValidacionPersonal {
  readonly nombreValido: boolean;
  readonly correoValido: boolean;
  readonly codigoPaisValido: boolean;
  readonly telefonoValido: boolean;
  readonly ciudadValida: boolean;
  /** Verdadero si toda la sección Información Personal es válida (Req 3.19). */
  readonly personalValido: boolean;
}

/** Resultado tipado de la validación de la sección Consulta SARLAFT (documento + fecha). */
export interface ResultadoValidacionSarlaftForm {
  readonly documentoValido: boolean;
  readonly fechaExpedicionValida: boolean;
  /** Verdadero si el formulario SARLAFT (documento + fecha) es válido (Req 3.12). */
  readonly sarlaftFormValido: boolean;
}

/**
 * Valida el nombre completo (Req 3.2): obligatorio y con longitud mínima de 3
 * caracteres (ignorando espacios en los extremos). Función pura y total.
 */
export function esNombreValido(nombre: string): boolean {
  return nombre.trim().length >= NOMBRE_LONGITUD_MIN;
}

/**
 * Valida el correo electrónico (Req 3.3): obligatorio y con formato válido.
 * Función pura y total.
 */
export function esCorreoValido(correo: string): boolean {
  return PATRON_CORREO.test(correo.trim());
}

/**
 * Valida el código de país del teléfono (Req 3.4): debe pertenecer a la
 * allowlist permitida. Función pura y total.
 */
export function esCodigoPaisValido(codigo: string): boolean {
  return CODIGOS_PAIS_PERMITIDOS.includes(codigo);
}

/**
 * Valida el número de teléfono (Req 3.4): obligatorio y con 7 a 10 dígitos.
 * Función pura y total.
 */
export function esTelefonoValido(telefono: string): boolean {
  return PATRON_TELEFONO.test(telefono);
}

/**
 * Valida la ciudad (Req 3.5): selector obligatorio cuyo valor debe pertenecer a
 * la allowlist de ciudades permitidas. Función pura y total.
 */
export function esCiudadValida(ciudad: string): boolean {
  return CIUDADES_PERMITIDAS.includes(ciudad);
}

/**
 * Valida el número de documento (Req 3.7): obligatorio y con 6 a 12 dígitos.
 * Función pura y total.
 */
export function esDocumentoValido(documento: string): boolean {
  return PATRON_DOCUMENTO.test(documento);
}

/**
 * Valida la fecha de expedición (Req 3.8): obligatoria y de tipo fecha válida.
 * Rechaza cadenas vacías y valores no parseables como fecha. Función pura y total.
 */
export function esFechaExpedicionValida(fechaIso: string): boolean {
  if (fechaIso.trim().length === 0) {
    return false;
  }
  return !Number.isNaN(Date.parse(fechaIso));
}

/**
 * Valida la sección Información Personal completa (Req 3.2–3.5, 3.19).
 * Función pura y total.
 *
 * @param datos valores capturados de la sección Información Personal.
 * @returns resultado tipado con la validez de cada campo y de la sección.
 */
export function validarInformacionPersonal(datos: {
  readonly nombreCompleto: string;
  readonly correo: string;
  readonly codigoPais: string;
  readonly telefono: string;
  readonly ciudad: string;
}): ResultadoValidacionPersonal {
  const nombreValido = esNombreValido(datos.nombreCompleto);
  const correoValido = esCorreoValido(datos.correo);
  const codigoPaisValido = esCodigoPaisValido(datos.codigoPais);
  const telefonoValido = esTelefonoValido(datos.telefono);
  const ciudadValida = esCiudadValida(datos.ciudad);
  return {
    nombreValido,
    correoValido,
    codigoPaisValido,
    telefonoValido,
    ciudadValida,
    personalValido:
      nombreValido &&
      correoValido &&
      codigoPaisValido &&
      telefonoValido &&
      ciudadValida,
  };
}

/**
 * Valida el formulario de la Consulta SARLAFT (documento + fecha) (Req 3.7, 3.8).
 * Función pura y total.
 *
 * @param documento número de documento (6–12 dígitos).
 * @param fechaExpedicion fecha de expedición ISO-8601.
 * @returns resultado tipado con la validez de cada campo y del formulario SARLAFT.
 */
export function validarFormularioSarlaft(
  documento: string,
  fechaExpedicion: string,
): ResultadoValidacionSarlaftForm {
  const documentoValido = esDocumentoValido(documento);
  const fechaExpedicionValida = esFechaExpedicionValida(fechaExpedicion);
  return {
    documentoValido,
    fechaExpedicionValida,
    sarlaftFormValido: documentoValido && fechaExpedicionValida,
  };
}
