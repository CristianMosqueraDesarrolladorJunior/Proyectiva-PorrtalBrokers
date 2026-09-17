/**
 * Modelos del Nuevo_Negocio y su configuración de precios (Req 31).
 * El cálculo autoritativo del resumen lo ejecuta el Motor_Precios_NN del API_Backend;
 * el cliente muestra el resultado recibido (Req 31.5, 31.6, 31.8).
 */

/** Frecuencia de pago del Nuevo_Negocio (Req 31.4). */
export type Frecuencia = 'mensual' | 'trimestral' | 'anual';

/** Paso 1: datos del cliente del Nuevo_Negocio (Req 31.2, 31.3). */
export interface DatosClienteNN {
  readonly nombreORazonSocial: string;
  readonly identificacion: string;
  readonly correo: string;
  readonly telefono: string;
  readonly direccion: string;
}

/** Paso 2: parámetros financieros del Nuevo_Negocio (Req 31.4). */
export interface ParametrosPreciosNN {
  readonly primaBase: number;
  readonly gastosAdministrativos: number;
  readonly descuentoPct: number;      // % sobre prima base
  readonly comisionPct: number;       // % sobre base correspondiente
  readonly frecuencia: Frecuencia;
}

/** Solicitud completa del Nuevo_Negocio enviada al API_Backend (Req 31.7). */
export interface NuevoNegocioRequest {
  readonly datosCliente: DatosClienteNN;
  readonly parametros: ParametrosPreciosNN;
}

// Borrador del Nuevo_Negocio: conserva los datos ingresados sin enviar (Req 31.9).
// Se guarda en memoria/estado del feature (nunca token ni PII en localStorage — Req 28.1).
export interface BorradorNuevoNegocio {
  readonly datosCliente: Partial<DatosClienteNN>;
  readonly parametros: Partial<ParametrosPreciosNN>;
  readonly pasoActual: number;
  readonly guardadoEn: string;        // ISO-8601
}

/** Resumen financiero del Nuevo_Negocio calculado por el Motor_Precios_NN (Req 31.5, 31.6). */
export interface ResumenPreciosNN {
  readonly primaBase: number;
  readonly gastosAdministrativos: number;
  readonly descuento: number;         // descuentoPct * primaBase
  readonly total: number;
  readonly comisionBroker: number;    // comisionPct * base
}

/** Alias del resumen financiero del Nuevo_Negocio (Req 31.5). */
export type ResumenNuevoNegocio = ResumenPreciosNN;
