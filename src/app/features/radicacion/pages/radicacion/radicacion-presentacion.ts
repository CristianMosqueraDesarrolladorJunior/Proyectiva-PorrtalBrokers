/**
 * Lógica PURA de presentación de la sección Radicación (Req 10, 11, 12).
 *
 * Ubicación: junto a la página de Radicación del feature `radicacion`. Es lógica de
 * presentación reutilizable, sin dependencias de Angular ni de `HttpClient`,
 * consumida por `RadicacionComponent` y por la prueba de propiedad (Property 10).
 * El backend SIEMPRE revalida los datos y documentos (Req 10.5, 13.5); esta lógica
 * es únicamente por UX/fail-fast.
 *
 * Todas las funciones son puras, totales y deterministas: no leen estado externo,
 * de modo que el resultado es reproducible (preparado para PBT).
 *
 * Alinea con Property 10 (design.md): para toda combinación de tipo de persona,
 * indicador de firma por apoderado e indicador de SARLAFT condicional, el conjunto
 * obligatorio derivado por `documentosRequeridosRadicacion()` cumple las reglas de
 * Persona_Natural (2 base), Persona_Juridica (3 base incluido Formulario SARLAFT),
 * apoderado (+2) y SARLAFT condicional en Persona_Natural (+1). El envío se habilita
 * solo cuando todos los obligatorios están cargados (Req 11.4).
 *
 * _Requirements: 10.1, 10.2, 10.3, 10.4, 11.1, 11.2, 11.3, 11.4, 12.1, 12.2, 12.3_
 */

import {
  documentosRequeridosRadicacion,
  type TipoDocumentoIdentidad,
  type TipoDocumentoRadicacion,
  type TipoPersona,
} from '../../../../core/models/radicacion.model';

/** Longitud mínima del número de documento del propietario (Req 10.1). */
export const DOCUMENTO_PROPIETARIO_LONGITUD_MIN = 5;

/** Longitud máxima del número de documento del propietario (Req 10.1). */
export const DOCUMENTO_PROPIETARIO_LONGITUD_MAX = 15;

/** Patrón del número de documento del propietario: solo dígitos, 5–15 (Req 10.1). */
const PATRON_DOCUMENTO_PROPIETARIO = /^\d{5,15}$/;

/** Etiqueta legible de cada documento de radicación mostrada en el uploader (Req 11, 12). */
export const ETIQUETA_DOCUMENTO_RADICACION: Readonly<
  Record<TipoDocumentoRadicacion, string>
> = {
  cedulaPropietario: 'Cédula del propietario',
  certificadoTradicion: 'Certificado de Tradición y Libertad',
  certificadoExistencia: 'Certificado de existencia',
  cedulaRepresentanteLegal: 'Cédula del Representante Legal',
  formularioSarlaft: 'Formulario SARLAFT',
  contratoArrendamientoFirmado: 'Contrato de arrendamiento firmado',
  poderApoderado: 'Poder del apoderado',
  cedulaApoderado: 'Cédula del apoderado',
};

/** Texto de ayuda mostrado bajo cada documento en el uploader (Req 11, 12, 13). */
export const DESCRIPCION_DOCUMENTO_RADICACION: Readonly<
  Record<TipoDocumentoRadicacion, string>
> = {
  cedulaPropietario: 'Documento de identidad del propietario del inmueble',
  certificadoTradicion: 'Vigencia no mayor a 90 días',
  certificadoExistencia: 'Vigencia no mayor a 30 días',
  cedulaRepresentanteLegal: 'Documento de identidad del representante legal',
  formularioSarlaft: 'Formulario SARLAFT 4.0 diligenciado',
  contratoArrendamientoFirmado: 'Opcional — Formato PDF o imagen',
  poderApoderado: 'Poder que faculta al apoderado para firmar',
  cedulaApoderado: 'Documento de identidad del apoderado',
};

/** Tipos de documento de identidad seleccionables para el propietario (Req 10.1). */
export const TIPOS_DOCUMENTO_IDENTIDAD: readonly TipoDocumentoIdentidad[] = [
  'CC',
  'CE',
  'NIT',
  'PA',
];

/** Etiqueta legible de cada tipo de documento de identidad (Req 10.1). */
export const ETIQUETA_TIPO_DOCUMENTO_IDENTIDAD: Readonly<
  Record<TipoDocumentoIdentidad, string>
> = {
  CC: 'Cédula de ciudadanía',
  CE: 'Cédula de extranjería',
  NIT: 'NIT',
  PA: 'Pasaporte',
};

/** Entrada mínima para derivar el conjunto obligatorio y el estado de envío. */
export interface EntradaRadicacion {
  readonly tipoPersona: TipoPersona;
  readonly firmaApoderado: boolean;
  readonly sarlaftRequiereFormulario: boolean;
}

/** Resultado tipado de la validación de los datos base de la radicación (Req 10.1). */
export interface ResultadoValidacionDatosRadicacion {
  readonly numeroDocumentoValido: boolean;
  readonly numeroEstudioValido: boolean;
  readonly datosValidos: boolean;
}

/**
 * Valida el número de documento del propietario (Req 10.1).
 * Acepta si y solo si está compuesto únicamente por dígitos y su longitud está
 * entre 5 y 15. Función pura y total.
 */
export function esNumeroDocumentoPropietarioValido(numero: string): boolean {
  return PATRON_DOCUMENTO_PROPIETARIO.test(numero);
}

/**
 * Valida el número de estudio de arrendamiento aprobado (Req 10.1).
 * Acepta si y solo si, tras recortar espacios, no está vacío. Función pura y total.
 */
export function esNumeroEstudioValido(numero: string): boolean {
  return numero.trim().length > 0;
}

/**
 * Valida los datos base de la radicación (Req 10.1).
 * Función pura y total.
 *
 * @param numeroDocumento número de documento del propietario.
 * @param numeroEstudio número de estudio de arrendamiento aprobado.
 * @returns resultado tipado con la validez de cada campo y del conjunto.
 */
export function validarDatosRadicacion(
  numeroDocumento: string,
  numeroEstudio: string,
): ResultadoValidacionDatosRadicacion {
  const numeroDocumentoValido = esNumeroDocumentoPropietarioValido(numeroDocumento);
  const numeroEstudioValido = esNumeroEstudioValido(numeroEstudio);
  return {
    numeroDocumentoValido,
    numeroEstudioValido,
    datosValidos: numeroDocumentoValido && numeroEstudioValido,
  };
}

/**
 * Deriva los documentos obligatorios pendientes de cargar (Req 11.4).
 *
 * Compara el conjunto obligatorio producido por `documentosRequeridosRadicacion()`
 * con los tipos ya cargados y devuelve, en orden, los que aún faltan. El contrato
 * de arrendamiento firmado es opcional y nunca aparece como pendiente (Req 11.3).
 * Función pura y total.
 *
 * @param entrada tipo de persona, caso apoderado e indicador de SARLAFT condicional.
 * @param cargados tipos de documento que ya tienen un archivo cargado.
 * @returns tipos obligatorios que faltan, en el orden en que deben mostrarse.
 */
export function documentosObligatoriosFaltantes(
  entrada: EntradaRadicacion,
  cargados: readonly TipoDocumentoRadicacion[],
): readonly TipoDocumentoRadicacion[] {
  const requeridos = documentosRequeridosRadicacion(entrada);
  const yaCargados = new Set<TipoDocumentoRadicacion>(cargados);
  return requeridos.filter((tipo) => !yaCargados.has(tipo));
}

/**
 * Indica si la radicación puede enviarse (Req 11.4).
 *
 * El envío se habilita si y solo si los datos base son válidos y no quedan
 * documentos obligatorios pendientes. Función pura y total.
 *
 * @param entrada tipo de persona, caso apoderado e indicador de SARLAFT condicional.
 * @param cargados tipos de documento que ya tienen un archivo cargado.
 * @param datosValidos resultado de `validarDatosRadicacion(...).datosValidos`.
 * @returns `true` si la radicación puede enviarse.
 */
export function puedeEnviarRadicacion(
  entrada: EntradaRadicacion,
  cargados: readonly TipoDocumentoRadicacion[],
  datosValidos: boolean,
): boolean {
  if (!datosValidos) {
    return false;
  }
  return documentosObligatoriosFaltantes(entrada, cargados).length === 0;
}

/** Etiqueta legible de la lista de documentos pendientes para el mensaje de UI (Req 11.4). */
export function etiquetasDocumentos(
  tipos: readonly TipoDocumentoRadicacion[],
): readonly string[] {
  return tipos.map((tipo) => ETIQUETA_DOCUMENTO_RADICACION[tipo]);
}
