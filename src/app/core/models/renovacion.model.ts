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

/** Motivo de la No Renovación; conjunto cerrado del proceso real de renovaciones. */
export type MotivoNoRenovacion = 'precioElevado' | 'ventaInmueble' | 'descontentoServicio';

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

// --- Gestión de renovación (wizard /renovaciones/detalle) -------------------
// Proceso real: 4 opciones (física, digital, caso especial, corrección) y TODAS
// validan SARLAFT antes de enviar la solicitud.

/** Resultado de la validación SARLAFT de renovación: vigente si tiene menos de 36 meses. */
export type EstadoSarlaftRenovacion = 'vigente' | 'no_vigente';

/** Consulta SARLAFT de la póliza; en la reconsulta se adjunta el SARLAFT actualizado. */
export interface ConsultaSarlaftRenovacionRequest {
  readonly numeroPoliza: string;
  readonly documentoActualizado?: DocumentoCargado;
}

/** Respuesta de la validación SARLAFT de renovación. El backend decide la vigencia. */
export interface ResultadoSarlaftRenovacion {
  readonly estado: EstadoSarlaftRenovacion;
  readonly ultimaExpedicion: string;      // ISO-8601
  readonly tiempoTranscurrido: string;    // legible, p. ej. "4 años, 2 meses"
  readonly mesesDesdeExpedicion: number;
  readonly validacionId: string;
}

/** Tipo de renovación: física (formulario cargado) o digital (detalles + ajuste). */
export type TipoSolicitudRenovacion = 'fisica' | 'digital';

/** Ajustes de la renovación digital (paso Ajuste). */
export interface AjustesRenovacion {
  readonly valorCanon: number;
  readonly administracion: number;
  readonly valorAseguradoServicios: number;
  readonly valorAseguradoDyF: number;
  readonly ipcAplicado: number;
}

/** Solicitud de renovación física o digital enviada tras SARLAFT vigente. */
export interface SolicitudRenovacionRequest {
  readonly numeroPoliza: string;
  readonly tipo: TipoSolicitudRenovacion;
  readonly formularioRenovacion?: DocumentoCargado; // física
  readonly modalidad?: ModalidadRenovacion;         // digital
  readonly ajustes?: AjustesRenovacion;             // digital con ajustes
  readonly comentarios?: string;
  readonly validacionSarlaftId: string;
}
