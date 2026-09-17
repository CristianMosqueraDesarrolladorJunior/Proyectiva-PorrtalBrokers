/**
 * Modelos de la Solicitud_Registro_Broker, la Consulta_SARLAFT y los documentos
 * obligatorios de registro (Req 3). El backend revalida todo (Req 3.23).
 */

import type { DocumentoCargado, TipoMimePermitido } from './documento.model';

/** Solicitud de registro de un aspirante a Broker (Req 3.1–3.16). */
export interface SolicitudRegistroBroker {
  readonly nombreCompleto: string;
  readonly correo: string;
  readonly codigoPais: string;    // '+57' por defecto
  readonly telefono: string;      // 7–10 dígitos
  readonly ciudad: string;
  readonly documento: string;     // 6–12 dígitos
  readonly fechaExpedicion: string; // ISO-8601
  readonly documentos: DocumentoRegistro[];  // los 4 documentos obligatorios de registro (Req 3.16)
}

// Identificador de cada documento obligatorio del registro de broker (Req 3.16).
// Es un conjunto distinto y separado de los documentos de Radicacion (ver TipoDocumentoRadicacion).
export type TipoDocumentoRegistro =
  | 'documentoIdentidad'      // "Documento de identidad del solicitante"
  | 'certificacionBancaria'   // "No mayor a 30 días" → vigencia ≤ 30 días
  | 'autorizacionPago'        // "Formato PDF o Imagen (Máx 5MB)" → límite 5 MB
  | 'rut';                    // "Registro Único Tributario actualizado"

// Reglas de validación de cada documento obligatorio del registro (Req 3.16, 3.17, 3.18).
// vigenciaMaxDias/tamanoMaxBytes null = sin umbral específico (aplica límite general de 10 MB del Req 13.2).
export interface ReglaDocumentoRegistro {
  readonly tipo: TipoDocumentoRegistro;
  readonly etiqueta: string;              // p. ej. 'Certificación Bancaria'
  readonly descripcion: string;           // texto de ayuda mostrado en el uploader
  readonly mimePermitidos: readonly TipoMimePermitido[]; // PDF/JPG/PNG (Req 3.17)
  readonly tamanoMaxBytes: number;        // 5 MB para autorizacionPago; 10 MB en el resto
  readonly vigenciaMaxDias: number | null; // 30 para certificacionBancaria; null en el resto
  readonly obligatorio: true;             // los 4 son obligatorios (Req 3.16, 3.19)
}

// Conjunto autoritativo de documentos de registro (Req 3.16). El backend revalida (Req 3.23).
export const DOCUMENTOS_REGISTRO_BROKER: readonly ReglaDocumentoRegistro[] = [
  { tipo: 'documentoIdentidad',    etiqueta: 'Documento de Identidad',   descripcion: 'Documento de identidad del solicitante', mimePermitidos: ['application/pdf', 'image/jpeg', 'image/png'], tamanoMaxBytes: 10_485_760, vigenciaMaxDias: null, obligatorio: true },
  { tipo: 'certificacionBancaria', etiqueta: 'Certificación Bancaria',   descripcion: 'No mayor a 30 días',                     mimePermitidos: ['application/pdf', 'image/jpeg', 'image/png'], tamanoMaxBytes: 10_485_760, vigenciaMaxDias: 30,   obligatorio: true },
  { tipo: 'autorizacionPago',      etiqueta: 'Autorización de Pago',     descripcion: 'Formato PDF o Imagen (Máx 5MB)',         mimePermitidos: ['application/pdf', 'image/jpeg', 'image/png'], tamanoMaxBytes: 5_242_880,  vigenciaMaxDias: null, obligatorio: true },
  { tipo: 'rut',                   etiqueta: 'RUT',                      descripcion: 'Registro Único Tributario actualizado',  mimePermitidos: ['application/pdf', 'image/jpeg', 'image/png'], tamanoMaxBytes: 10_485_760, vigenciaMaxDias: null, obligatorio: true },
] as const;

// Documento de registro cargado, asociado a su tipo obligatorio.
export interface DocumentoRegistro extends DocumentoCargado {
  readonly tipo: TipoDocumentoRegistro;
}

/** Nivel de la alerta SARLAFT según la antigüedad de la fecha de expedición (Req 3.9–3.11). */
export type NivelSarlaft = 'exito' | 'advertencia' | 'error';

/** Resultado de la Consulta_SARLAFT mostrado tras una verificación exitosa (Req 3.15). */
export interface ResultadoSarlaft {
  readonly nivel: NivelSarlaft;
  readonly fechaExpedicion: string;
  readonly estado: string;        // 'Vigente'
  readonly vigencia: string;      // 'Menor a 3 años'
}
