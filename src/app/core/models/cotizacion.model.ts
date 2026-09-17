/**
 * Modelos del Cotizador (Req 7, 8, 9).
 * El cálculo autoritativo lo realiza el Motor_Tarifas del API_Backend; el cliente
 * valida por UX y muestra el resultado recibido (Req 8.2–8.5).
 */

/** Tipo de inmueble a cotizar; Vivienda/Comercio del prototipo o valores adicionales (Req 7.1, 7.4). */
export type TipoInmueble = 'Vivienda' | 'Comercio' | string;

/** Datos de entrada de la Cotizacion capturados por el Broker (Req 7.1–7.8). */
export interface CotizacionRequest {
  readonly departamento: string;
  readonly ciudad: string;
  readonly tipoInmueble: TipoInmueble;
  readonly canon: number;             // > 0
  readonly administracion?: number;
  readonly fechaInicioVigencia: string;
  readonly mesesVigencia: number;     // 1–36
  readonly coberturas: CoberturaSeleccion[];
  readonly aseguraIva?: boolean;      // solo Comercio (IVA 19% del canon)
}

/** Selección de una cobertura y su monto asegurado en pasos de $500.000 (Req 7.5, 7.6, 14.2–14.4). */
export interface CoberturaSeleccion {
  readonly id: string;
  readonly activa: boolean;
  readonly montoAsegurado: number;    // pasos de 500000, mínimo 0
}

/** Concepto individual del desglose de la Cotizacion calculado por el Motor_Tarifas (Req 8.2–8.5). */
export interface ConceptoCotizacion {
  readonly concepto: string;
  readonly valorAsegurado: number;
  readonly meses: number;
  readonly baseCalculoPeriodo: number;
  readonly tasa: number;              // 3.0% o 3.5%
  readonly primaNeta: number;
  readonly iva: number;               // 19% de primaNeta
  readonly total: number;             // primaNeta + iva
}

/** Resultado completo de la Cotizacion recibido del API_Backend (Req 8.1). */
export interface CotizacionResult {
  readonly conceptos: ConceptoCotizacion[];
  readonly primaNetaTotal: number;
  readonly ivaTotal: number;
  readonly total: number;             // suma de primaNeta + iva de todos
}
