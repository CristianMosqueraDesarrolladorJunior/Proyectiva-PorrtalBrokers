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
// de los documentos de registro de broker (DOCUMENTOS_REGISTRO_BROKER).
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
 * Resultado del Estudio de Arrendamiento (paso 2 del flujo de radicación).
 * Es una API-gate: solo `aprobado` permite continuar; `no_aprobado` bloquea el
 * proceso y expone la URL de Estudio Digital para que el inquilino lo realice.
 */
export type EstadoEstudioArrendamiento = 'pendiente' | 'aprobado' | 'no_aprobado';

/** Datos del inquilino que ocupa el inmueble y debe tener el estudio aprobado (paso 1). */
export interface DatosInquilino {
  readonly nombre: string;
  readonly cedula?: string;
  readonly celular?: string;
  readonly correo?: string;
}

/** Inmueble arrendado que ampara el estudio (lo devuelve la API de estudio). */
export interface DatosInmueble {
  readonly direccion: string;
  readonly ciudad: string;
  readonly destino: 'Vivienda' | 'Comercio';
  readonly canon: number;
  readonly administracion: number;
  /** Nombre del propietario registrado en el estudio. */
  readonly propietario?: string;
}

/** Resultado de la consulta a la API de Estudio de Arrendamiento (paso 2). */
export interface ResultadoEstudioArrendamiento {
  readonly estado: EstadoEstudioArrendamiento;
  readonly numeroEstudio?: string;
  readonly fechaConsulta: string;
  /** Solo `no_aprobado`: URL de Estudio Digital para que el inquilino lo realice. */
  readonly urlEstudioDigital?: string;
  /** Inquilino del estudio. La PII llega enmascarada desde el backend. */
  readonly inquilino?: DatosInquilino;
  /** Inmueble y condiciones económicas del arrendamiento. */
  readonly inmueble?: DatosInmueble;
  /** Vigencia del estudio aprobado (ISO `yyyy-mm-dd`). */
  readonly vigenteHasta?: string;
}

// Datos base de la radicación (Req 10.1). El apoderado es el caso en que quien firma
// el contrato no es el propietario (Req 10.2).
export interface RadicacionRequest {
  readonly tipoDocumentoPropietario: TipoDocumentoIdentidad; // tipo de documento del propietario (Req 10.1)
  readonly numeroDocumentoPropietario: string;               // número de documento del propietario (Req 10.1)
  readonly numeroEstudioArrendamiento: string;               // número de estudio de arrendamiento aprobado (Req 10.1)
  readonly estadoEstudio?: EstadoEstudioArrendamiento;       // resultado de la API de estudio (paso 2)
  readonly inquilino?: DatosInquilino;                       // inquilino que ocupa el inmueble (paso 1)
  readonly tipoPersona: TipoPersona;                         // Persona_Natural / Persona_Juridica (Req 10.3, 10.4)
  readonly firmaApoderado: boolean;                          // true si quien firma es apoderado (Req 10.2)
  readonly tipoDocumentoApoderado?: TipoDocumentoIdentidad;  // solo caso apoderado: a quien se consulta SARLAFT
  readonly numeroDocumentoApoderado?: string;                // solo caso apoderado
  readonly sarlaftRequiereFormulario: boolean;               // solo Persona_Natural: marca que SARLAFT 4.0 exige cargar el formulario (Req 12.1, 12.2)
  readonly estadoSarlaft?: EstadoSarlaftRadicacion;          // resultado de la API SARLAFT del paso 4
  readonly documentos: DocumentoRadicacion[];
}

/**
 * Resultado de la API SARLAFT en el paso 4 de la radicación (3 salidas del flujo):
 * - `actualizado`: continúa a la carga de documentos.
 * - `desactualizado`: se envía una URL al propietario/apoderado para actualizar y
 *   luego se reconsulta.
 * - `consultable`: el caso baja al Warehouse para revisión y termina en el portal.
 */
export type EstadoSarlaftRadicacion = 'actualizado' | 'desactualizado' | 'consultable';

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
  readonly tipoPersona: TipoPersona;
  readonly numeroEstudioArrendamiento: string;
}

/** Respuesta de la API SARLAFT de la radicación. El backend decide la salida. */
export interface ResultadoSarlaftRadicacion {
  readonly estado: EstadoSarlaftRadicacion;
  readonly mensaje: string;
  /** Fecha ISO de la consulta. */
  readonly fechaConsulta: string;
  /** Solo `desactualizado`: URL de actualización enviada al destinatario. */
  readonly enlaceActualizacion?: string;
  /** Solo `desactualizado`: correo enmascarado de la persona consultada. */
  readonly correoDestinatario?: string;
  /** Solo `consultable`: radicado con el que el caso queda en el Warehouse. */
  readonly radicado?: string;
}

/** Documento de radicación cargado, asociado a su tipo (Req 11, 12). */
export interface DocumentoRadicacion extends DocumentoCargado {
  readonly tipo: TipoDocumentoRadicacion;
}

// Presentación de documentos requeridos según tipo de persona, caso apoderado y SARLAFT
// condicional (Req 10.2, 11.1, 11.2, 12.1–12.3). El envío se habilita solo si están
// todos los obligatorios (Req 11.4). El backend revalida (Req 10.5, 13.5).
export function documentosRequeridosRadicacion(req: {
  readonly tipoPersona: TipoPersona;
  readonly firmaApoderado: boolean;
  readonly sarlaftRequiereFormulario: boolean;
}): readonly TipoDocumentoRadicacion[] {
  const base: TipoDocumentoRadicacion[] =
    req.tipoPersona === 'natural'
      ? ['cedulaPropietario', 'certificadoTradicion']
      : ['certificadoExistencia', 'cedulaRepresentanteLegal', 'formularioSarlaft'];
  // Persona_Natural: el Formulario SARLAFT solo es obligatorio si el broker marca que
  // la validación SARLAFT 4.0 requiere carga del formulario (Req 12.1, 12.2).
  if (req.tipoPersona === 'natural' && req.sarlaftRequiereFormulario) {
    base.push('formularioSarlaft');
  }
  // Caso apoderado: se exigen Poder del apoderado y Cédula del apoderado (Req 10.2).
  if (req.firmaApoderado) {
    base.push('poderApoderado', 'cedulaApoderado');
  }
  return base;
}
