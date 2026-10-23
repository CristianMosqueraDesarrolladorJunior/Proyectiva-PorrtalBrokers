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
  /** Gestión del área en el Warehouse de renovaciones (Por renovar, En expedición, Renovada…), si la hay. */
  readonly gestion?: string | null;
  /** Valor literal del Warehouse (p. ej. "Autogestionado", "Desocupación"). */
  readonly estadoWarehouse?: string | null;
  /** Qué se puede hacer hoy (regla única del backend para broker, comercial y administrador). */
  readonly accion?: AccionRenovacion;
  /** Renovada y con recaudo de la nueva vigencia en el libro de comisiones. */
  readonly pagada?: boolean;
}

/** Acción de una renovación: solo RENOVAR, CORREGIR e INDUCCION se gestionan (vencida 6–11 meses = inducción; más de 11 = fuera de plazo). */
export type AccionRenovacion = 'RENOVAR' | 'CORREGIR' | 'INDUCCION' | 'EN_PROCESO' | 'CERRADA' | 'FUERA_PLAZO';
