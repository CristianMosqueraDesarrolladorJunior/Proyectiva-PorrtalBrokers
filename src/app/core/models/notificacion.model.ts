/** Severidad visual de una notificación del bróker. */
export type TonoNotificacion = 'alerta' | 'info' | 'exito';

/** Notificación derivada de los datos operativos del bróker (KPIs y calendario). */
export interface Notificacion {
  readonly id: string;
  readonly titulo: string;
  readonly detalle: string;
  readonly tono: TonoNotificacion;
  /** Ruta de la aplicación a la que lleva la notificación. */
  readonly ruta: string;
  readonly leida: boolean;
}
