/**
 * Modelos del listado de solicitudes (Seguimiento) y del Detalle_Solicitud (Req 6, 34).
 * El broker ve los datos completos de sus negocios (sin enmascarar).
 */

/** Estado de una Solicitud en el Seguimiento (Req 5.4, 6.3). */
export type EstadoSolicitud =
  | 'radicada' | 'en_revision' | 'aprobada' | 'expedida' | 'bloqueada' | 'observada';

/** Fila del listado de solicitudes del Seguimiento (Req 6.1, 6.2). */
export interface Solicitud {
  readonly referencia: string;
  readonly cliente: string;
  readonly producto: string;
  readonly estado: EstadoSolicitud;
  readonly estadoPago: string;
  readonly fecha: string;
  readonly comision: number;
}

/** Página de resultados con paginación de 10 por página (Req 6.5). */
export interface PaginaResultado<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly size: number;              // 10 por página
}

/** Hito de la línea de tiempo del Detalle_Solicitud (Req 34.2). */
export interface HitoTimeline {
  readonly titulo: string;
  readonly fecha: string;             // ISO-8601
  readonly completado: boolean;
}

/**
 * Detalle de una Solicitud mostrado en el Drawer_Detalle (Req 34.1, 34.2).
 * Extiende la fila de Seguimiento con la línea de tiempo de hitos del trámite.
 * Los datos se obtienen del API_Backend completos (sin enmascarar).
 */
export interface DetalleSolicitud extends Solicitud {
  readonly timeline: readonly HitoTimeline[];
  /** Canon radicado (el elegido por el broker, o el del contrato o la cotización). */
  readonly canon?: number | null;
  /** Comisión estimada de la cotización: la real se causa al expedir. */
  readonly comisionEstimada?: number | null;
  /** Datos completos del negocio (solo los ve el broker dueño de la radicación). */
  readonly partes?: PartesNegocio | null;
}

/** Persona del negocio tal como quedó en el contrato o en la radicación. */
export interface PersonaNegocio {
  readonly nombre: string | null;
  readonly tipoDocumento: string | null;
  readonly documento: string | null;
  readonly telefono: string | null;
  readonly correo: string | null;
  readonly direccion: string | null;
}

/** Propietario, inquilino, inmueble y póliza expedida de una radicación. */
export interface PartesNegocio {
  readonly propietario: PersonaNegocio | null;
  readonly inquilino: PersonaNegocio | null;
  readonly inmueble: string | null;
  readonly ciudad: string | null;
  readonly numeroPoliza: string | null;
  readonly inicioVigencia: string | null;
  readonly finVigencia: string | null;
  readonly primaTotal: number | null;
}

/** Documento de una radicación que el broker puede ver desde Seguimiento (`GET /solicitudes/{ref}/documentos`). */
export interface DocumentoSolicitud {
  /** `cotizacion` y `contrato` se descargan por sus endpoints; `ctl` y `cargado`, del archivo de la solicitud. */
  readonly tipo: 'cotizacion' | 'contrato' | 'cuenta_cobro' | 'ctl' | 'cargado';
  readonly clave: string;
  readonly titulo: string;
  /** COT-… o CTR-… para la cotización y el contrato; `null` en los demás. */
  readonly referencia: string | null;
}
