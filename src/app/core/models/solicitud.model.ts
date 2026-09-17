/**
 * Modelos del listado de solicitudes (Seguimiento) y del Detalle_Solicitud (Req 6, 34).
 * Los campos de PII llegan enmascarados desde el API_Backend (Req 28.4, 34.5).
 */

/** Estado de una Solicitud en el Seguimiento (Req 5.4, 6.3). */
export type EstadoSolicitud =
  | 'radicada' | 'en_revision' | 'aprobada' | 'bloqueada' | 'observada';

/** Fila del listado de solicitudes del Seguimiento (Req 6.1, 6.2). */
export interface Solicitud {
  readonly referencia: string;
  readonly cliente: string;           // enmascarado
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
 * Los datos se obtienen del API_Backend y llegan con la PII enmascarada (Req 34.4, 34.5).
 */
export interface DetalleSolicitud extends Solicitud {
  readonly timeline: readonly HitoTimeline[];
}
