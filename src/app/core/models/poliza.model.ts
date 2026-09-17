/**
 * Modelos de la consulta de pólizas por cédula (Req 16).
 * El estado usa la insignia de estado correspondiente definida por los Design_Token (Req 16.3).
 */

/** Estado de una Poliza; valores del prototipo o adicionales del backend (Req 16.3). */
export type EstadoPoliza = 'Renovada' | 'Próxima a renovar' | 'A punto de vencer' | string;

/** Póliza consultada por cédula del propietario (Req 16.1, 16.2). */
export interface Poliza {
  readonly numero: string;
  readonly cliente: string;
  readonly producto: string;
  readonly fechaVencimiento: string;
  readonly estado: EstadoPoliza;
}
