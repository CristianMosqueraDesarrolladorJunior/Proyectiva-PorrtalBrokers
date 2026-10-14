/**
 * Modelos de la Solicitud_Registro_Broker, la Consulta_SARLAFT y los documentos
 * obligatorios de registro (Req 3). El backend revalida todo (Req 3.23).
 */

import type { DocumentoCargado, TipoMimePermitido } from './documento.model';
import type { EstadoSarlaftRadicacion, TipoDocumentoIdentidad } from './radicacion.model';

/** Solicitud de registro de un aspirante a Broker (Req 3.1–3.16). */
export interface SolicitudRegistroBroker {
  readonly nombreCompleto: string;
  readonly correo: string;
  readonly codigoPais: string;    // '+57' por defecto
  readonly telefono: string;      // 7–10 dígitos
  readonly ciudad: string;
  readonly tipoDocumento: TipoDocumentoIdentidad;
  readonly documento: string;     // 6–12 dígitos
  /** Resultado de la verificación SARLAFT del paso 2 (el backend revalida). */
  readonly estadoSarlaft?: EstadoSarlaftRadicacion;
  /** Legado: fecha de expedición de la consulta anterior por antigüedad. */
  readonly fechaExpedicion?: string; // ISO-8601
  readonly documentos: DocumentoRegistro[];  // los 4 documentos obligatorios de registro (Req 3.16)
}

/**
 * Ingreso simple como Prospecto (spec backend, Req 1.2): sin documentación.
 * El prospecto elige su contraseña; Firebase Auth la valida y PostgreSQL conserva
 * únicamente su hash local para los entornos sin proveedor de identidad.
 */
export interface RegistroProspectoRequest {
  readonly nombreCompleto: string;
  readonly correo: string;
  readonly codigoPais: string;
  readonly telefono: string;
  readonly ciudad: string;
  readonly tipoDocumento: TipoDocumentoIdentidad;
  readonly documento: string;
  /** Contraseña elegida por el prospecto (política fuerte; el backend revalida, Req 2.6). */
  readonly password: string;
}

/**
 * Payload exacto del endpoint `POST /brokers/prospectos` del backend
 * (`CrearProspectoRequest`): nombres de campo del contrato REST. El `AuthService`
 * mapea `RegistroProspectoRequest` (modelo del front) a esta forma.
 */
export interface CrearProspectoPayload {
  readonly cedula: string;
  readonly nombre: string;
  readonly telefono: string;
  readonly correo: string;
  readonly ciudad: string;
  readonly tipoDocumento: TipoDocumentoIdentidad;
  readonly codigoPais: string;
  readonly password: string;
}

/** Verificación SARLAFT del aspirante con el documento del paso 1. */
export interface VerificacionSarlaftRegistroRequest {
  readonly tipoDocumento: TipoDocumentoIdentidad;
  readonly documento: string;
  readonly correo: string;
  /** Celular del aspirante: SARLAFT le envía el SMS con la URL de actualización (igual que el cotizador). */
  readonly celular?: string;
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

/** Formatos aceptados para los documentos cargados (PDF o imagen). */
export const MIMES_DOCUMENTO: readonly TipoMimePermitido[] = ['application/pdf', 'image/jpeg', 'image/png'];

/** Fila del catálogo `documento_legalizacion` (código, descripción, ayuda y reglas de carga). */
export interface FilaDocumentoLegalizacion {
  readonly codigo: string;
  readonly descripcion: string;
  readonly [columna: string]: unknown;
}

/** Documentos de legalización del broker a partir del catálogo `documento_legalizacion` (BD). El backend revalida. */
export function documentosRegistroBroker(filas: readonly FilaDocumentoLegalizacion[]): readonly ReglaDocumentoRegistro[] {
  return filas.map((f) => ({
    tipo: f.codigo as TipoDocumentoRegistro,
    etiqueta: f.descripcion,
    descripcion: String(f['ayuda'] ?? ''),
    mimePermitidos: MIMES_DOCUMENTO,
    tamanoMaxBytes: Number(f['tamano_max_bytes']),
    vigenciaMaxDias: f['vigencia_max_dias'] == null ? null : Number(f['vigencia_max_dias']),
    obligatorio: true,
  }));
}

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
