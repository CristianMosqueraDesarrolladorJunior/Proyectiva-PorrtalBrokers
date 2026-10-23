/** Fila que el broker envía: póliza y valor pagado por el propietario (con IVA). */
export interface FilaCuentaCobroRequest {
  readonly poliza: string;
  readonly valor: number | null;
}

/** Fila tal como la escribe el broker en el formulario. */
export interface FilaCruda {
  readonly poliza: string;
  readonly valor: string;
}

/** Fila revisada por el servidor, con la base sin IVA y la comisión del acuerdo del broker. */
export interface FilaCuenta {
  readonly poliza: string;
  readonly valor: number;
  readonly neto: number;
  readonly comision: number;
}

/** `POST /comisiones/cuentas/revision`: el servidor revisa y calcula; el front solo lo muestra. */
export interface RevisionCuenta {
  readonly filas: readonly FilaCuenta[];
  readonly errores: readonly string[];
  readonly avisos: readonly string[];
  readonly totalValor: number;
  readonly totalComision: number;
}

/** `POST /comisiones/cuentas` y `/cuentas/revision`: el porcentaje lo pone el servidor (broker de la sesión). */
export interface CuentaCobroRequest {
  readonly filas: readonly FilaCuentaCobroRequest[];
}

/** Acuerdo comercial vigente del broker (`GET /comisiones/acuerdo`). */
export interface AcuerdoComision {
  /** 20 o 25 según el broker; lo administra el área. */
  readonly porcentaje: number;
}

/** Cuenta de cobro generada (historial y confirmación). */
export interface CuentaCobroResponse {
  /** Número único de la cuenta de cobro («CUENTA DE COBRO N° …»), lo asigna el portal. */
  readonly consecutivo: number;
  /** Referencia del sistema (CDC-…), como CTR- del contrato y COT- de la cotización. */
  readonly referencia: string;
  readonly id: string;
  /** ISO-8601. */
  readonly fecha: string;
  readonly polizas: number;
  readonly totalValor: number;
  readonly totalComision: number;
  readonly porcentaje: number;
  readonly enLetras: string;
  /** `true` cuando el correo al área salió. */
  readonly enviada: boolean;
  /** Solo en la vista del área: broker y comercial de su cartera. */
  readonly broker?: string;
  readonly comercial?: string;
  readonly numerosPoliza?: readonly string[];
  /** pendiente · pagada · rechazada (lo registra el Administrador). */
  readonly estadoPago?: string;
  readonly valorPagado?: number | null;
  readonly pagadoAt?: string | null;
  readonly referenciaPago?: string | null;
  readonly motivoPago?: string | null;
  readonly ultimoMovimiento?: string | null;
}

/** Estado de cobro de la comisión de una póliza. Solo `PENDIENTE` se puede incluir en una cuenta de cobro. */
export type EstadoCobro = 'PENDIENTE' | 'EN_COBRO' | 'ORDEN_PAGO' | 'PAGADA' | 'FUERA_PLAZO' | 'SIN_RECAUDO';

/** Póliza expedida del broker con los datos de su pago (libro de comisiones). Fechas ISO `AAAA-MM-DD`. */
export interface PolizaExpedida {
  readonly numeroPoliza: string;
  readonly fechaEmision: string | null;
  readonly estadoPago: EstadoCobro;
  readonly fechaPago: string | null;
  /** Último día para cobrarla por el portal; `null` si no se informa. */
  readonly fechaLimiteCobro: string | null;
  /** Valor pagado por el propietario (con IVA); 0 si no se conoce. */
  readonly valorPoliza: number;
  readonly porcentaje: number;
  readonly comision: number;
  /** Orden de pago o factura con la que se pagó; vacío si no hay. */
  readonly ordenPago: string;
}
