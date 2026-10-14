/**
 * Modelos de la Radicacion de póliza (Req 10, 11, 12).
 * Incluye la función pura `documentosRequeridosRadicacion()` que deriva el conjunto
 * obligatorio de documentos según tipo de persona, caso apoderado y SARLAFT condicional.
 * El backend revalida tipo, formato y presencia (Req 10.5, 13.5).
 */

import type { DocumentoCargado } from './documento.model';

/** Tipo de persona del propietario (Req 10.3, 10.4). */
export type TipoPersona = 'natural' | 'juridica';

/** Tipo de documento de identidad del propietario/representante (Req 10.1, 17.2). */
export type TipoDocumentoIdentidad = 'CC' | 'CE' | 'NIT' | 'PA';

// Documentos obligatorios/ opcionales de Radicacion (Req 11, 12). Conjunto distinto
// de los documentos de registro de broker (catálogo documento_legalizacion).
export type TipoDocumentoRadicacion =
  | 'cedulaPropietario'          // Persona_Natural (Req 11.1)
  | 'certificadoTradicion'       // Persona_Natural, vigencia ≤ 90 días (Req 11.1, 13.3)
  | 'certificadoExistencia'      // Persona_Juridica, vigencia ≤ 30 días (Req 11.2, 13.4)
  | 'cedulaRepresentanteLegal'   // Persona_Juridica (Req 11.2)
  | 'formularioSarlaft'          // Persona_Juridica obligatorio; Persona_Natural condicional (Req 11.2, 12)
  | 'contratoArrendamientoFirmado' // opcional (Req 11.3)
  | 'poderApoderado'             // caso apoderado (Req 10.2)
  | 'cedulaApoderado';           // caso apoderado (Req 10.2)

/**
 * Estado de conjunto cerrado del Estudio Digital (paso 2 del flujo de radicación),
 * tal cual lo deriva el backend (`EstudioResponse.estado`). Es una API-gate: solo
 * `APROBADO` permite continuar; `NO_APROBADO` bloquea y expone la URL de Estudio
 * Digital; `PENDIENTE` indica que el estudio sigue en trámite.
 */
export type EstadoEstudioArrendamiento = 'PENDIENTE' | 'APROBADO' | 'NO_APROBADO';

/**
 * Resultado de la consulta a la API de Estudio Digital del Libertador (paso 2),
 * alineado 1:1 con el DTO `EstudioResponse` del backend. Toda la PII
 * (nombres/apellidos/documento del inquilino, inmueble) llega completa (sin enmascarar).
 */
export interface ResultadoEstudioArrendamiento {
  /** Estado de conjunto cerrado derivado (APROBADO/NO_APROBADO/PENDIENTE). */
  readonly estado: EstadoEstudioArrendamiento;
  /** Status del estudio tal cual lo entrega el sistema externo (texto libre). */
  readonly status?: string;
  /** Consecutivo del estudio consultado (alias: numeroEstudio). */
  readonly consecutivo?: string;
  readonly numeroEstudio?: string;
  /** Fecha ISO de la consulta. */
  readonly fechaConsulta: string;
  /** Nombres del inquilino (o nulo). */
  readonly nombresInquilino?: string;
  /** Apellidos del inquilino (o nulo). */
  readonly apellidosInquilino?: string;
  /** Documento del inquilino (o nulo). */
  readonly documentoInquilino?: string;
  /** Nombre completo del inquilino (o nulo). */
  readonly inquilino?: string;
  /** Datos del inmueble (solo si APROBADO). */
  readonly inmueble?: string;
  /** Fecha de vigencia del estudio aprobado (alias: vigenteHasta). */
  readonly fechaVigencia?: string;
  readonly vigenteHasta?: string;
  /** Solo NO_APROBADO: URL de Estudio Digital (alias: enlaceEstudio). */
  readonly urlEstudioDigital?: string;
  readonly enlaceEstudio?: string;
  /** Mensaje del sistema externo cuando no hay estudio (o nulo). */
  readonly mensaje?: string;
}

// Datos base de la radicación (Req 10.1). El apoderado es el caso en que quien firma
// el contrato no es el propietario (Req 10.2).
export interface RadicacionRequest {
  /** Referencia del contrato generado en el portal: toda radicación lo exige (backend 400/422). */
  readonly contratoReferencia: string;
  readonly numeroEstudioArrendamiento: string;
  readonly tipoDocumentoInquilino: TipoDocumentoIdentidad;
  readonly documentoInquilino: string;
  /** Tipos de documento cargados, solo del vocabulario del backend y sin duplicados. */
  readonly documentosCargados: readonly TipoDocumentoRadicacion[];
  /** Autorización de tratamiento de datos (Habeas Data). */
  readonly autorizacionDatos: boolean;
  readonly tipoPersona: TipoPersona;
  readonly firmaApoderado: boolean;
  /** Firmante apoderado: el servidor reconsulta su SARLAFT antes de radicar. */
  readonly tipoDocumentoApoderado?: string;
  readonly documentoApoderado?: string;
  readonly correoApoderado?: string;
  /** Observación del broker para el área. */
  readonly observaciones?: string;
}

/**
 * Resultado de la API SARLAFT en el paso 4 de la radicación (3 salidas del flujo),
 * alineado 1:1 con el enum `EstadoSarlaftRadicacion` del backend (MAYÚSCULAS):
 * - `ACTUALIZADO`: continúa a la carga de documentos.
 * - `DESACTUALIZADO`: se envía una URL al propietario/apoderado para actualizar y
 *   luego se reconsulta.
 * - `CONSULTABLE`: el caso baja a revisión de Cumplimiento y termina en el portal.
 */
export type EstadoSarlaftRadicacion = 'ACTUALIZADO' | 'DESACTUALIZADO' | 'CONSULTABLE';

/**
 * Persona a quien se consulta SARLAFT en la radicación: quien firma el contrato.
 * Si hay apoderado, la consulta (y la URL de actualización) es para el apoderado;
 * si no, para el propietario.
 */
export type SujetoSarlaft = 'propietario' | 'apoderado';

/** Parámetros de la consulta SARLAFT de la radicación (paso 4). */
export interface ConsultaSarlaftRadicacionRequest {
  /** Quién se consulta: propietario o apoderado. */
  readonly sujeto: SujetoSarlaft;
  /** Documento de la persona consultada. */
  readonly tipoDocumento: TipoDocumentoIdentidad;
  readonly numeroDocumento: string;
  /**
   * Celular de la persona consultada (propietario/apoderado): destino del SMS con la URL de
   * Conocimiento de Cliente cuando SARLAFT exige generarla. Nunca el del broker.
   */
  readonly telefono: string;
  readonly tipoPersona: TipoPersona;
  readonly numeroEstudioArrendamiento: string;
}

/**
 * Respuesta de la API SARLAFT de la radicación, alineada 1:1 con el DTO
 * `SarlaftSujetoResponse` del backend. El backend decide la salida.
 */
export interface ResultadoSarlaftRadicacion {
  /** Sujeto consultado (PROPIETARIO/APODERADO). */
  readonly sujeto?: string;
  readonly estado: EstadoSarlaftRadicacion;
  /** Fecha ISO de la consulta. */
  readonly fechaConsulta: string;
  /** Solo `DESACTUALIZADO`: URL de actualización para el sujeto. */
  readonly enlaceActualizacion?: string;
  /** Solo `DESACTUALIZADO`: correo enmascarado de la persona consultada. */
  readonly correoEnmascarado?: string;
  /** Solo `CONSULTABLE`: radicado de la derivación a Cumplimiento. */
  readonly radicadoCumplimiento?: string;
  /** Mensaje de actualización de datos que devuelve SARLAFT (qué debe actualizar el tercero). */
  readonly mensaje?: string;
}

/** Documento de radicación cargado, asociado a su tipo (Req 11, 12). */
export interface DocumentoRadicacion extends DocumentoCargado {
  readonly tipo: TipoDocumentoRadicacion;
}

// Presentación de documentos requeridos según tipo de persona, caso apoderado y SARLAFT
// condicional (Req 10.2, 11.1, 11.2, 12.1–12.3). El envío se habilita solo si están
// todos los obligatorios (Req 11.4). El backend revalida (Req 10.5, 13.5).
// Los documentos y a quién aplican (NATURAL / JURIDICA / APODERADO / OPCIONAL) vienen del catálogo
// `documento_radicacion` de la BD; aquí solo se combinan según la selección del broker.
export function documentosRequeridosRadicacion(req: {
  readonly tipoPersona: TipoPersona;
  readonly firmaApoderado: boolean;
  readonly sarlaftRequiereFormulario: boolean;
  readonly documentos: readonly { readonly codigo: string; readonly [columna: string]: unknown }[];
}): readonly TipoDocumentoRadicacion[] {
  const de = (aplica: string): TipoDocumentoRadicacion[] =>
    req.documentos.filter((d) => d['aplica'] === aplica).map((d) => d.codigo as TipoDocumentoRadicacion);
  const base = de(req.tipoPersona === 'natural' ? 'NATURAL' : 'JURIDICA');
  // Persona_Natural: el Formulario SARLAFT solo es obligatorio si la validación SARLAFT 4.0
  // pide el formulario (Req 12.1, 12.2).
  if (req.tipoPersona === 'natural' && req.sarlaftRequiereFormulario) {
    base.push('formularioSarlaft');
  }
  // Caso apoderado: documentos del catálogo que aplican al apoderado (Req 10.2).
  if (req.firmaApoderado) {
    base.push(...de('APODERADO'));
  }
  return base;
}
