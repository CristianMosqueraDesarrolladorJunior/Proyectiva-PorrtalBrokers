/**
 * Lógica PURA del formulario de Renovación de póliza (Req 17, 18, 19, 20).
 *
 * Ubicación: junto al feature `renovacion`. Es lógica de presentación reutilizable,
 * sin dependencias de Angular ni de `HttpClient`, consumida por
 * `RenovacionComponent` y por la prueba de propiedad (Property 28, tarea 13.3).
 * El backend SIEMPRE revalida la Renovacion antes de registrarla (Req 17, 20.3);
 * esta validación es únicamente por UX/fail-fast.
 *
 * Todas las funciones son puras, totales y deterministas: no leen estado externo
 * ni el reloj del sistema, de modo que el resultado es reproducible (preparado
 * para PBT).
 *
 * Alinea con Property 28 (design.md):
 *   Para todo `RenovacionRequest`, la renovación es válida si y solo si están
 *   diligenciados los datos obligatorios del propietario (tipo/número de documento,
 *   celular, correo, dirección de correspondencia, ciudad de residencia), el número
 *   de póliza y la fecha de finalización de vigencia, el Formulario de Renovación
 *   está cargado y hay aceptación explícita; el Formulario SARLAFT es opcional y su
 *   ausencia activa el `AvisoSarlaftEnlaceDigital`.
 *
 * _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 18.2, 18.3, 18.4, 19.1, 20.1, 20.2_
 */

import type { DocumentoCargado } from '../../core/models/documento.model';
import type {
  AvisoSarlaftEnlaceDigital,
  ModalidadRenovacion,
} from '../../core/models/renovacion.model';
import type {
  TipoDocumentoIdentidad,
  TipoPersona,
} from '../../core/models/radicacion.model';

/** Tipos de persona ofrecidos en la Renovacion (Req 17.1). */
export const TIPOS_PERSONA_RENOVACION: readonly TipoPersona[] = ['natural', 'juridica'];

/** Etiqueta legible de cada tipo de persona para la UI (Req 17.1). */
export const ETIQUETA_TIPO_PERSONA: Readonly<Record<TipoPersona, string>> = {
  natural: 'Persona Natural',
  juridica: 'Persona Jurídica',
};

/** Tipos de documento de identidad ofrecidos para el propietario (Req 17.2). */
export const TIPOS_DOCUMENTO_IDENTIDAD: readonly TipoDocumentoIdentidad[] = [
  'CC',
  'CE',
  'NIT',
  'PA',
];

/** Etiqueta legible de cada tipo de documento de identidad para la UI (Req 17.2). */
export const ETIQUETA_TIPO_DOCUMENTO: Readonly<Record<TipoDocumentoIdentidad, string>> = {
  CC: 'Cédula de ciudadanía',
  CE: 'Cédula de extranjería',
  NIT: 'NIT',
  PA: 'Pasaporte',
};

/** Modalidades de renovación ofrecidas (Req 18.2, 18.3). */
export const MODALIDADES_RENOVACION: readonly ModalidadRenovacion[] = [
  'mismosValores',
  'conAjustes',
];

/** Etiqueta legible de cada modalidad de renovación para la UI (Req 18.2, 18.3). */
export const ETIQUETA_MODALIDAD_RENOVACION: Readonly<
  Record<ModalidadRenovacion, string>
> = {
  mismosValores: 'Renovar con mismos valores',
  conAjustes: 'Renovar con ajustes',
};

/** Descripción de cada modalidad de renovación para la UI (Req 18.2, 18.3). */
export const DESCRIPCION_MODALIDAD_RENOVACION: Readonly<
  Record<ModalidadRenovacion, string>
> = {
  mismosValores: 'Continúa directamente a la carga del formulario de renovación.',
  conAjustes: 'Continúa al paso de ajustes antes de cargar el formulario.',
};

/** Mensaje del aviso de envío del Formulario SARLAFT por enlace digital (Req 17.5). */
export const MENSAJE_SARLAFT_ENLACE_DIGITAL =
  'El formulario SARLAFT se enviará al propietario mediante enlace digital.';

/** Cantidad mínima de dígitos aceptada para el número de documento del propietario. */
export const DOCUMENTO_MIN_DIGITOS = 6;

/** Cantidad máxima de dígitos aceptada para el número de documento del propietario. */
export const DOCUMENTO_MAX_DIGITOS = 12;

/** Cantidad mínima de dígitos aceptada para el celular del propietario. */
export const CELULAR_MIN_DIGITOS = 7;

/** Cantidad máxima de dígitos aceptada para el celular del propietario. */
export const CELULAR_MAX_DIGITOS = 10;

/** Patrón de correo electrónico simple (validación de cliente por UX). */
const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Solo dígitos, sin signo ni separadores. */
const PATRON_SOLO_DIGITOS = /^\d+$/;

/**
 * Datos capturables del propietario y de la póliza para evaluar la validez de la
 * Renovacion (Req 17.2, 17.4, 19.1, 20.1). Es la forma mínima que consume la
 * lógica pura; el componente construye este objeto a partir de sus signals.
 */
export interface DatosRenovacion {
  readonly tipoPersona: string;
  readonly tipoDocumentoPropietario: string;
  readonly numeroDocumentoPropietario: string;
  readonly celular: string;
  readonly correo: string;
  readonly direccionCorrespondencia: string;
  readonly ciudadResidencia: string;
  readonly numeroPoliza: string;
  readonly fechaFinVigencia: string;
  readonly modalidad: string;
  readonly formularioRenovacion?: DocumentoCargado;
  readonly aceptacionExplicita: boolean;
}

/** Indica si un valor es solo dígitos con longitud dentro del rango [min, max]. */
function esDigitosEnRango(valor: string, min: number, max: number): boolean {
  const limpio = valor.trim();
  return (
    PATRON_SOLO_DIGITOS.test(limpio) &&
    limpio.length >= min &&
    limpio.length <= max
  );
}

/** Indica si una cadena no está vacía tras recortar espacios. */
function noVacio(valor: string): boolean {
  return valor.trim().length > 0;
}

/**
 * Indica si el tipo de persona seleccionado pertenece al conjunto definido (Req 17.1).
 * Función pura, total y determinista.
 */
export function esTipoPersonaValido(valor: string): valor is TipoPersona {
  return (TIPOS_PERSONA_RENOVACION as readonly string[]).includes(valor);
}

/**
 * Indica si el tipo de documento seleccionado pertenece al conjunto definido (Req 17.2).
 * Función pura, total y determinista.
 */
export function esTipoDocumentoValido(valor: string): valor is TipoDocumentoIdentidad {
  return (TIPOS_DOCUMENTO_IDENTIDAD as readonly string[]).includes(valor);
}

/**
 * Indica si la modalidad seleccionada pertenece al conjunto definido (Req 18.2, 18.3).
 * Función pura, total y determinista.
 */
export function esModalidadValida(valor: string): valor is ModalidadRenovacion {
  return (MODALIDADES_RENOVACION as readonly string[]).includes(valor);
}

/**
 * Indica si el número de documento del propietario es válido: solo dígitos con
 * longitud entre 6 y 12 (Req 17.2). Función pura, total y determinista.
 */
export function esDocumentoValido(valor: string): boolean {
  return esDigitosEnRango(valor, DOCUMENTO_MIN_DIGITOS, DOCUMENTO_MAX_DIGITOS);
}

/**
 * Indica si el celular del propietario es válido: solo dígitos con longitud entre
 * 7 y 10 (Req 17.2). Función pura, total y determinista.
 */
export function esCelularValido(valor: string): boolean {
  return esDigitosEnRango(valor, CELULAR_MIN_DIGITOS, CELULAR_MAX_DIGITOS);
}

/**
 * Indica si el correo del propietario tiene un formato válido (Req 17.2).
 * Función pura, total y determinista.
 */
export function esCorreoValido(valor: string): boolean {
  return PATRON_CORREO.test(valor.trim());
}

/**
 * Indica si los datos obligatorios del propietario y de la póliza están
 * diligenciados y son válidos (Req 17.2, 17.4). No incluye documento ni
 * aceptación; se usa para habilitar el avance entre pasos.
 * Función pura, total y determinista.
 *
 * @param datos Datos capturados del propietario y de la póliza.
 * @returns `true` si todos los campos obligatorios son válidos.
 */
export function sonDatosPropietarioValidos(datos: DatosRenovacion): boolean {
  return (
    esTipoPersonaValido(datos.tipoPersona) &&
    esTipoDocumentoValido(datos.tipoDocumentoPropietario) &&
    esDocumentoValido(datos.numeroDocumentoPropietario) &&
    esCelularValido(datos.celular) &&
    esCorreoValido(datos.correo) &&
    noVacio(datos.direccionCorrespondencia) &&
    noVacio(datos.ciudadResidencia) &&
    noVacio(datos.numeroPoliza) &&
    noVacio(datos.fechaFinVigencia) &&
    esModalidadValida(datos.modalidad)
  );
}

/**
 * Errores específicos por campo de la Renovacion. Cadena vacía = campo válido.
 * Indica al Broker exactamente qué dato quedó mal y por qué (UX de validación).
 */
export interface ErroresRenovacion {
  readonly tipoPersona: string;
  readonly tipoDocumentoPropietario: string;
  readonly numeroDocumentoPropietario: string;
  readonly celular: string;
  readonly correo: string;
  readonly direccionCorrespondencia: string;
  readonly ciudadResidencia: string;
  readonly numeroPoliza: string;
  readonly fechaFinVigencia: string;
  readonly modalidad: string;
}

/**
 * Valida cada dato del propietario/póliza y devuelve un mensaje específico por
 * campo (Req 17.2, 17.4). Cadena vacía indica que el campo es válido. Distingue
 * entre "obligatorio" (vacío) y "formato inválido" para orientar al Broker.
 * Función pura, total y determinista.
 *
 * @param datos Datos capturados del propietario y de la póliza.
 * @returns Mapa de errores por campo (vacío = válido).
 */
export function validarDatosRenovacion(datos: DatosRenovacion): ErroresRenovacion {
  return {
    tipoPersona: esTipoPersonaValido(datos.tipoPersona)
      ? ''
      : 'Selecciona el tipo de propietario (Persona Natural o Jurídica).',
    tipoDocumentoPropietario: esTipoDocumentoValido(datos.tipoDocumentoPropietario)
      ? ''
      : 'Selecciona el tipo de documento del propietario.',
    numeroDocumentoPropietario: mensajeDocumento(datos.numeroDocumentoPropietario),
    celular: mensajeCelular(datos.celular),
    correo: mensajeCorreo(datos.correo),
    direccionCorrespondencia: noVacio(datos.direccionCorrespondencia)
      ? ''
      : 'La dirección de correspondencia es obligatoria.',
    ciudadResidencia: noVacio(datos.ciudadResidencia)
      ? ''
      : 'La ciudad de residencia es obligatoria.',
    numeroPoliza: noVacio(datos.numeroPoliza)
      ? ''
      : 'El número de póliza es obligatorio.',
    fechaFinVigencia: noVacio(datos.fechaFinVigencia)
      ? ''
      : 'La fecha de finalización de vigencia es obligatoria.',
    modalidad: esModalidadValida(datos.modalidad)
      ? ''
      : 'Selecciona la modalidad de renovación.',
  };
}

/** Mensaje específico del número de documento: distingue vacío de formato/longitud. */
function mensajeDocumento(valor: string): string {
  const limpio = valor.trim();
  if (limpio.length === 0) {
    return 'El número de documento es obligatorio.';
  }
  if (!PATRON_SOLO_DIGITOS.test(limpio)) {
    return 'El número de documento debe contener solo dígitos, sin espacios ni signos.';
  }
  if (limpio.length < DOCUMENTO_MIN_DIGITOS || limpio.length > DOCUMENTO_MAX_DIGITOS) {
    return `El número de documento debe tener entre ${DOCUMENTO_MIN_DIGITOS} y ${DOCUMENTO_MAX_DIGITOS} dígitos (ingresaste ${limpio.length}).`;
  }
  return '';
}

/** Mensaje específico del celular: distingue vacío de formato/longitud. */
function mensajeCelular(valor: string): string {
  const limpio = valor.trim();
  if (limpio.length === 0) {
    return 'El celular es obligatorio.';
  }
  if (!PATRON_SOLO_DIGITOS.test(limpio)) {
    return 'El celular debe contener solo dígitos, sin espacios ni signos.';
  }
  if (limpio.length < CELULAR_MIN_DIGITOS || limpio.length > CELULAR_MAX_DIGITOS) {
    return `El celular debe tener entre ${CELULAR_MIN_DIGITOS} y ${CELULAR_MAX_DIGITOS} dígitos (ingresaste ${limpio.length}).`;
  }
  return '';
}

/** Mensaje específico del correo: distingue vacío de formato. */
function mensajeCorreo(valor: string): string {
  const limpio = valor.trim();
  if (limpio.length === 0) {
    return 'El correo electrónico es obligatorio.';
  }
  if (!PATRON_CORREO.test(limpio)) {
    return 'El correo no tiene un formato válido. Ej: correo@ejemplo.com';
  }
  return '';
}

/**
 * Decide si la Renovacion puede enviarse (Req 17.2, 17.3, 17.4, 20.1, 20.2).
 *
 * El envío está habilitado si y solo si los datos obligatorios del propietario y de
 * la póliza son válidos, el Formulario de Renovación está cargado (obligatorio) y
 * hay aceptación explícita. El Formulario SARLAFT es opcional y NO afecta la
 * habilitación. Los comentarios son opcionales.
 * Función pura, total y determinista.
 *
 * @param datos Datos capturados de la Renovacion.
 * @returns `true` si la Renovacion puede enviarse.
 */
export function puedeEnviarRenovacion(datos: DatosRenovacion): boolean {
  return (
    sonDatosPropietarioValidos(datos) &&
    datos.formularioRenovacion !== undefined &&
    datos.aceptacionExplicita === true
  );
}

/**
 * Construye el `AvisoSarlaftEnlaceDigital` según la presencia del Formulario
 * SARLAFT (Req 17.3, 17.5).
 *
 * Cuando el Formulario SARLAFT NO está cargado, el aviso se muestra informando
 * que el formulario se enviará al propietario mediante enlace digital; cuando sí
 * está cargado, el aviso no se muestra. Función pura, total y determinista.
 *
 * @param formularioSarlaft Formulario SARLAFT cargado (o `undefined` si ausente).
 * @returns Aviso con `mostrar` y `mensaje`.
 */
export function avisoSarlaft(
  formularioSarlaft: DocumentoCargado | undefined,
): AvisoSarlaftEnlaceDigital {
  return {
    mostrar: formularioSarlaft === undefined,
    mensaje: MENSAJE_SARLAFT_ENLACE_DIGITAL,
  };
}
