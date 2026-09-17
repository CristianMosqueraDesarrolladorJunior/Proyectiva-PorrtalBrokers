/**
 * Modelos del Generador_Contrato de Arrendamiento multipaso de 4 pasos (Req 30).
 * El API_Backend revalida tipo, formato y presencia de cada campo antes de generar
 * el contrato (Req 30.9).
 */

import type { TipoDocumentoIdentidad } from './radicacion.model';

/** Duración del contrato en meses ofrecida por el generador (Req 30.5). */
export type DuracionContratoMeses = 12 | 24 | 36;

/** Paso 1: datos del arrendador (Req 30.2). */
export interface DatosArrendador {
  readonly nombres: string;
  readonly apellidos: string;
  readonly tipoIdentificacion: TipoDocumentoIdentidad;
  readonly numeroIdentificacion: string;
  readonly telefono: string;
  readonly correo: string;
  readonly direccionResidencia: string;
}

/** Paso 2: datos del arrendatario (Req 30.3). */
export interface DatosArrendatario {
  readonly nombres: string;
  readonly apellidos: string;
  readonly tipoIdentificacion: TipoDocumentoIdentidad;
  readonly numeroIdentificacion: string;
  readonly telefono: string;
  readonly correo: string;
  readonly ocupacion: string;
}

/** Paso 3: datos del inmueble (Req 30.4). */
export interface DatosInmueble {
  readonly tipoInmueble: string;
  readonly uso: string;
  readonly direccionCompleta: string;
  readonly ciudad: string;
  readonly matriculaInmobiliaria: string;
  readonly estrato: number;
  readonly areaMetrosCuadrados: number;
}

/** Paso 4: condiciones económicas del contrato (Req 30.5). */
export interface CondicionesEconomicas {
  readonly canonMensual: number;
  readonly cuotaAdministracion: number;
  readonly duracionMeses: DuracionContratoMeses;
  readonly diaPagoMensual: number;          // 1–31
  readonly fechaInicio: string;             // ISO-8601
  readonly reajusteAnual: string;
  readonly serviciosIncluidos: readonly string[];
  readonly incluyeDeudoresSolidarios: boolean;
}

/** Solicitud completa de generación del Contrato_Arrendamiento (Req 30.7). */
export interface ContratoArrendamientoRequest {
  readonly arrendador: DatosArrendador;
  readonly arrendatario: DatosArrendatario;
  readonly inmueble: DatosInmueble;
  readonly condiciones: CondicionesEconomicas;
}
