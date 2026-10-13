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
  type EstadoSarlaftRadicacion,
  type SujetoSarlaft,
  type TipoDocumentoIdentidad,
  type TipoDocumentoRadicacion,
  type RadicacionRequest,
  type TipoPersona,
} from '../../../../core/models/radicacion.model';

/** Longitud mínima del número de documento del propietario (Req 10.1). */
export const DOCUMENTO_PROPIETARIO_LONGITUD_MIN = 5;

/** Longitud máxima del número de documento del propietario (Req 10.1). */
export const DOCUMENTO_PROPIETARIO_LONGITUD_MAX = 15;

/** Patrón del número de documento del propietario: solo dígitos, 5–15 (Req 10.1). */
const PATRON_DOCUMENTO_PROPIETARIO = /^\d{5,15}$/;

/** Entrada mínima para derivar el conjunto obligatorio y el estado de envío. */
export interface EntradaRadicacion {
  readonly tipoPersona: TipoPersona;
  readonly firmaApoderado: boolean;
  readonly sarlaftRequiereFormulario: boolean;
  /** Filas del catálogo `documento_radicacion`. */
  readonly documentos: readonly { readonly codigo: string; readonly [columna: string]: unknown }[];
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
  etiquetas: Readonly<Record<string, string>>,
): readonly string[] {
  return tipos.map((tipo) => etiquetas[tipo] ?? tipo);
}

// --- Paso 4: Validación SARLAFT (3 salidas del flujo de radicación) ---------

/** Pasos del stepper de la radicación, alineados al flujo 02. */
export const PASOS_RADICACION: readonly string[] = [
  'Datos y estudio',
  'Firmante',
  'Conocimiento de Cliente',
  'Documentos',
  'Envío',
];

/**
 * A quién se consulta SARLAFT en la radicación: si firma un apoderado, al
 * apoderado; si no, al propietario. Función pura y total.
 */
export function sujetoSarlaft(firmaApoderado: boolean): SujetoSarlaft {
  return firmaApoderado ? 'apoderado' : 'propietario';
}

/**
 * Indica si ya hay datos suficientes para consultar SARLAFT: datos del
 * propietario y estudio válidos y, en el caso apoderado, su número de documento
 * válido. Función pura y total.
 */
export function puedeConsultarSarlaftRadicacion(
  datosValidos: boolean,
  firmaApoderado: boolean,
  numeroDocumentoApoderado: string,
): boolean {
  if (!datosValidos) {
    return false;
  }
  return !firmaApoderado || esNumeroDocumentoPropietarioValido(numeroDocumentoApoderado.trim());
}

/**
 * Clave que identifica a quién se consultó en SARLAFT. Si el broker cambia el
 * firmante, el tipo/número de documento consultado o el tipo de persona, el
 * resultado anterior deja de aplicar y hay que volver a consultar.
 * Función pura y total.
 */
export function claveConsultaSarlaft(
  sujeto: SujetoSarlaft,
  tipoDocumento: TipoDocumentoIdentidad,
  numeroDocumento: string,
  tipoPersona: TipoPersona,
): string {
  return `${sujeto}|${tipoDocumento}|${numeroDocumento.trim()}|${tipoPersona}`;
}

/**
 * Indica si la carga de documentos está habilitada: solo con SARLAFT
 * `actualizado` (salida 1). Desactualizado espera la actualización y
 * consultable termina el trámite en el Warehouse. Función pura y total.
 */
export function permiteCargarDocumentos(estado: EstadoSarlaftRadicacion | null): boolean {
  return estado === 'ACTUALIZADO';
}

/**
 * Paso activo del stepper (0-indexado) según el avance real. Función pura y total.
 * @param datosValidos datos del propietario y estudio válidos.
 * @param estadoSarlaft resultado vigente de la consulta SARLAFT, o `null`.
 * @param faltantes cantidad de documentos obligatorios pendientes.
 */
export function pasoActivoRadicacion(
  datosValidos: boolean,
  estadoSarlaft: EstadoSarlaftRadicacion | null,
  faltantes: number,
): number {
  if (!datosValidos) {
    return 0;
  }
  if (!permiteCargarDocumentos(estadoSarlaft)) {
    return 2;
  }
  return faltantes > 0 ? 3 : 4;
}


/** Datos de pantalla necesarios para armar el envío de la radicación. */
export interface EntradaPayloadRadicacion {
  readonly contratoReferencia: string | null | undefined;
  readonly numeroEstudioArrendamiento: string;
  readonly tipoDocumentoInquilino: TipoDocumentoIdentidad;
  readonly documentoInquilino: string;
  readonly documentosCargados: readonly string[];
  readonly autorizacionDatos: boolean;
  readonly tipoPersona: TipoPersona;
  readonly firmaApoderado: boolean;
  /** Códigos que acepta el backend en `documentosCargados` (catálogo, sin los opcionales). */
  readonly vocabulario: readonly string[];
}

/**
 * Construye el payload de radicación con EXACTAMENTE las claves del `RadicacionRequest` del backend.
 * Los documentos se filtran contra la allowlist y se deduplican. Función pura y total.
 */
export function construirPayloadRadicacion(e: EntradaPayloadRadicacion): RadicacionRequest {
  const permitidos = new Set<string>(e.vocabulario);
  const documentos = [...new Set(e.documentosCargados.map((d) => d.trim()))].filter((d) =>
    permitidos.has(d),
  ) as TipoDocumentoRadicacion[];
  return {
    contratoReferencia: (e.contratoReferencia ?? '').trim(),
    numeroEstudioArrendamiento: e.numeroEstudioArrendamiento.trim(),
    tipoDocumentoInquilino: e.tipoDocumentoInquilino,
    documentoInquilino: e.documentoInquilino.trim(),
    documentosCargados: documentos,
    autorizacionDatos: e.autorizacionDatos,
    tipoPersona: e.tipoPersona,
    firmaApoderado: e.firmaApoderado,
  };
}
