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
