/**
 * Modelos de la Renovacion de póliza, No Renovación y Caso Especial (Req 17–23).
 * Incluye el aviso de envío del formulario SARLAFT por enlace digital (Req 17.5).
 */

import type { DocumentoCargado } from './documento.model';
import type { TipoDocumentoIdentidad, TipoPersona } from './radicacion.model';

/** Modalidad de renovación seleccionada por el Broker (Req 18.2, 18.3). */
export type ModalidadRenovacion = 'mismosValores' | 'conAjustes';

/** Valores del último periodo facturado mostrados al abrir el detalle de la póliza (Req 18.1). */
export interface ValoresReferenciaUltimoPeriodo {
  readonly canon: number;
  readonly primaNeta: number;
  readonly iva: number;
  readonly total: number;
  readonly numeroPoliza: string;
}

/** Datos de la Renovacion capturados por el Broker (Req 17–20). */
export interface RenovacionRequest {
  readonly tipoPersona: TipoPersona;                          // Req 17.1
  readonly tipoDocumentoPropietario: TipoDocumentoIdentidad;  // Req 17.2
  readonly numeroDocumentoPropietario: string;                // Req 17.2
  readonly celular: string;                                   // Req 17.2
  readonly correo: string;                                    // Req 17.2
  readonly direccionCorrespondencia: string;                  // Req 17.2
  readonly ciudadResidencia: string;                          // Req 17.2
  readonly numeroPoliza: string;                              // Req 17.4
  readonly fechaFinVigencia: string;                          // ISO-8601 (Req 17.4)
  readonly modalidad: ModalidadRenovacion;                    // Req 18.2, 18.3
  readonly formularioRenovacion: DocumentoCargado;            // obligatorio (Req 17.3, 19.1, 19.2)
  readonly formularioSarlaft?: DocumentoCargado;              // opcional (Req 17.3, 17.5)
  readonly comentarios?: string;                              // Req 19.3
  readonly aceptacionExplicita: boolean;                      // Req 20.1, 20.2
}

// Cuando no se carga el Formulario SARLAFT, el Portal informa que se enviará al
// propietario mediante enlace digital (Req 17.5).
export interface AvisoSarlaftEnlaceDigital {
  readonly mostrar: boolean;    // true cuando formularioSarlaft está ausente
  readonly mensaje: string;     // "El formulario SARLAFT se enviará al propietario mediante enlace digital."
}

/** Motivo de la No Renovación; conjunto cerrado (Req 22.1). */
export type MotivoNoRenovacion =
  | 'costoElevado' | 'cambioProveedor' | 'yaNoNecesita' | 'insatisfaccionServicio';

/** Notificación de No Renovación radicada por el Broker (Req 22). */
export interface NoRenovacionRequest {
  readonly numeroPoliza: string;
  readonly motivo: MotivoNoRenovacion;   // obligatorio (Req 22.1, 22.3)
  readonly observaciones?: string;       // opcional (Req 22.1)
}

/** Tipo de Caso Especial de renovación (Req 23). */
export type TipoCasoEspecial = 'otroSi' | 'cesionContrato';

/** Solicitud de Caso Especial (Otro Sí / Cesión) con documento legal PDF (Req 23). */
export interface CasoEspecialRequest {
  readonly numeroPoliza: string;
  readonly tipo: TipoCasoEspecial;
  readonly documentoLegal: DocumentoCargado; // PDF (Req 23.1, 23.2)
  readonly observaciones?: string;           // Req 23.1
}
