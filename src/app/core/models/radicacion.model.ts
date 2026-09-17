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

// Datos base de la radicación (Req 10.1). El apoderado es el caso en que quien firma
// el contrato no es el propietario (Req 10.2).
export interface RadicacionRequest {
  readonly tipoDocumentoPropietario: TipoDocumentoIdentidad; // tipo de documento del propietario (Req 10.1)
  readonly numeroDocumentoPropietario: string;               // número de documento del propietario (Req 10.1)
  readonly numeroEstudioArrendamiento: string;               // número de estudio de arrendamiento aprobado (Req 10.1)
  readonly tipoPersona: TipoPersona;                         // Persona_Natural / Persona_Juridica (Req 10.3, 10.4)
  readonly firmaApoderado: boolean;                          // true si quien firma es apoderado (Req 10.2)
  readonly sarlaftRequiereFormulario: boolean;               // solo Persona_Natural: marca que SARLAFT 4.0 exige cargar el formulario (Req 12.1, 12.2)
  readonly documentos: DocumentoRadicacion[];
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
