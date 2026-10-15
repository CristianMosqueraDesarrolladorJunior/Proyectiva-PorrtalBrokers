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
/** Motivo de no renovación: valor del catálogo `motivo_no_renovacion` (igual al del Warehouse). */
export type MotivoNoRenovacion = string;

/** Notificación de No Renovación radicada por el Broker (Req 22). */
export interface NoRenovacionRequest {
  readonly numeroPoliza: string;
  readonly motivo: MotivoNoRenovacion;   // obligatorio (Req 22.1, 22.3)
  readonly observaciones?: string;       // opcional (Req 22.1)
}

/** Proceso especial: código del catálogo `tipo_caso_especial` (OTRO_SI, CESION…), igual al `procesoEspecial` del Warehouse. */
export type TipoCasoEspecial = string;

/** Solicitud de Caso Especial (Otro Sí / Cesión) con sus documentos de soporte (Req 23). */
export interface CasoEspecialRequest {
  readonly numeroPoliza: string;
  readonly tipo: TipoCasoEspecial;
  readonly documentos: readonly File[]; // van a documentosProceso del Warehouse
  readonly observaciones: string;       // obligatorias, como en Comercial renovaciones
  readonly sarlaftActualizado?: File;   // si el SARLAFT del asegurado no estaba vigente
}

/** Corrección de una renovación devuelta por Gestión Documental (estado CORRECCION). */
export interface CorreccionRenovacionRequest {
  readonly numeroPoliza: string;
  readonly documentos: readonly File[];
  readonly observaciones?: string;
  readonly sarlaftActualizado?: File;
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

/** SARLAFT aceptado en el asistente: con el certificado actualizado que cargó el broker, si lo hubo. */
export interface SarlaftRenovacionAceptado extends ResultadoSarlaftRenovacion {
  readonly sarlaftActualizado?: File;
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

/** Detalle financiero de la cotización (mismos campos que guarda Comercial renovaciones en la col F). */
export interface CotizacionRenovacion {
  readonly meses: number;
  readonly dias: number;
  readonly aseguradoCanon: number;
  readonly primaNetaCanon: number;
  readonly ivaCanon: number;
  readonly totalCanon: number;
  readonly primaNetaServ: number;
  readonly ivaServ: number;
  readonly totalServ: number;
  readonly primaNetaDyF: number;
  readonly ivaDyF: number;
  readonly totalDyF: number;
  readonly granTotal: number;
  /** `ipc_supera_tope`, `vigencia_restringida`, `dyf_bajo_minimo`. */
  readonly alertas: readonly string[];
}

/** Propuesta de nueva vigencia que calcula el backend. */
export interface PropuestaRenovacion {
  readonly modalidad: 'anterior' | 'nueva';
  readonly inicio: string; // ISO yyyy-mm-dd
  readonly fin: string;
  readonly ipc: number;
  readonly canon: number;
  readonly administracion: number;
  readonly valorAseguradoServicios: number;
  readonly valorAseguradoDyf: number;
  readonly cotizacion: CotizacionRenovacion;
}

/** Póliza que vence (col B del Warehouse de renovaciones) y reglas de la renovación digital. */
export interface CondicionesRenovacion {
  readonly poliza: string;
  readonly asegurado: string | null;
  readonly destino: string | null;
  readonly vigencia: string | null;
  readonly vencimiento: string | null;
  readonly canon: number;
  readonly administracion: number;
  readonly valorAseguradoServicios: number;
  readonly valorAseguradoDyf: number;
  readonly ipcDefecto: number;
  readonly topeIpc: number;
  readonly vigenciaMinimaMeses: number;
  readonly anterior: PropuestaRenovacion;
  readonly nueva: PropuestaRenovacion;
}

/** Datos que se recotizan en el paso Ajuste (modalidad «nueva»). */
export interface CotizacionRenovacionRequest {
  readonly modalidad: 'anterior' | 'nueva';
  readonly ipc?: number;
  readonly canon?: number;
  readonly administracion?: number;
  readonly valorAseguradoServicios?: number;
  readonly valorAseguradoDyF?: number;
  readonly fechaInicio?: string;
  readonly fechaFin?: string;
}

/** Solicitud de renovación física o digital enviada tras SARLAFT vigente. */
export interface SolicitudRenovacionRequest {
  readonly numeroPoliza: string;
  readonly tipo: TipoSolicitudRenovacion;
  readonly formularioRenovacion?: File;             // física: formato diligenciado y firmado
  readonly modalidad?: ModalidadRenovacion;         // digital
  readonly ajustes?: AjustesRenovacion;             // digital con ajustes
  readonly fechaInicio?: string;                    // nueva vigencia (ISO)
  readonly fechaFin?: string;
  readonly comentarios?: string;
  readonly validacionSarlaftId: string;
  readonly sarlaftActualizado?: File;               // SARLAFT no vigente: certificado actualizado
}

/** Datos para rellenar el formato oficial de renovación de Bolívar (renovación física). */
export interface FormatoRenovacionRequest {
  readonly destino: 'vivienda' | 'comercio';
  readonly canonActual: number;
  readonly canonNuevo: number;
  readonly administracion?: number;
  readonly fechaRenovacion: string; // ISO yyyy-mm-dd
}

/** Formato generado y guardado (GCS privado); el PDF se descarga con sesión. */
export interface FormatoRenovacionResponse {
  readonly id: string;
  readonly numeroPoliza: string;
  readonly requiereOtroSi: boolean;
  readonly generadoEn: string;
}

/** Datos de una de las 3 partes del contrato en la inducción. */
export interface ParteInduccion {
  readonly nombre: string;
  readonly tipoIdentificacion: string;
  readonly numeroIdentificacion: string;
  readonly telefono: string;
  readonly correo: string;
}

/** Inducción de una póliza ya vencida: las 3 partes; contrato y paz y salvo van como archivos. */
export interface InduccionRequest {
  readonly propietario: ParteInduccion;
  readonly inquilino: ParteInduccion;
  readonly deudorSolidario?: ParteInduccion;
  readonly observaciones?: string;
}

/** Inducción en la consola del área (`GET /admin/inducciones`). */
export interface InduccionAdminResponse {
  readonly id: string;
  readonly numeroPoliza: string;
  readonly radicado: string;
  readonly estado: string;
  readonly fecha: string;
  readonly broker: string;
  readonly comercial: string;
  readonly enviada: boolean;
}
