/**
 * Modelos del Generador_Contrato de Arrendamiento multipaso de 4 pasos (Req 30).
 * El API_Backend revalida tipo, formato y presencia de cada campo antes de generar
 * el contrato (Req 30.9).
 */

import type { TipoDocumentoIdentidad } from './radicacion.model';

/** Duración del contrato en meses ofrecida por el generador (Req 30.5). */
export type DuracionContratoMeses = 12 | 24 | 36;

/** Persona natural o jurídica de una parte del contrato (la jurídica lleva la razón social en «nombres»). */
export type TipoPersonaContrato = 'NATURAL' | 'JURIDICA';

/** Representante legal de una persona jurídica. */
export interface RepresentanteLegalContrato {
  readonly nombre: string;
  readonly tipoIdentificacion: TipoDocumentoIdentidad;
  readonly numeroIdentificacion: string;
}

/** Apoderado que firma por una parte. */
export interface ApoderadoContrato {
  readonly nombre: string;
  readonly tipoIdentificacion: TipoDocumentoIdentidad;
  readonly numeroIdentificacion: string;
  readonly direccion?: string;
  readonly telefono?: string;
  readonly correo?: string;
}

/** Lo que una parte agrega a nombre y documento: persona natural/jurídica, representante legal y apoderado. */
export interface ParteExtra {
  readonly tipoPersona: TipoPersonaContrato;
  readonly representanteLegal: RepresentanteLegalContrato | null;
  readonly apoderado: ApoderadoContrato | null;
}

export const PARTE_EXTRA_VACIA: ParteExtra = { tipoPersona: 'NATURAL', representanteLegal: null, apoderado: null };

/** Campos de {@link ParteExtra} tal como viajan en la solicitud (solo lo que aplica a la parte). */
export function extraParaSolicitud(e: ParteExtra): {
  tipoPersona?: TipoPersonaContrato;
  representanteLegal?: RepresentanteLegalContrato;
  apoderado?: ApoderadoContrato;
} {
  return {
    ...(e.tipoPersona === 'JURIDICA' ? { tipoPersona: 'JURIDICA' as const } : {}),
    ...(e.tipoPersona === 'JURIDICA' && e.representanteLegal ? { representanteLegal: e.representanteLegal } : {}),
    ...(e.apoderado ? { apoderado: e.apoderado } : {}),
  };
}

/** Paso 1: datos del arrendador (Req 30.2). */
export interface DatosArrendador {
  readonly nombres: string;
  readonly apellidos: string;
  readonly tipoIdentificacion: TipoDocumentoIdentidad;
  readonly numeroIdentificacion: string;
  readonly telefono: string;
  readonly correo: string;
  readonly direccionResidencia: string;
  readonly ciudadExpedicion?: string;
  readonly direccionNotificacion?: string;
  readonly tipoPersona?: TipoPersonaContrato;
  readonly representanteLegal?: RepresentanteLegalContrato;
  readonly apoderado?: ApoderadoContrato;
}

/** Paso 2: datos del arrendatario (Req 30.3). */
export interface DatosArrendatario {
  readonly nombres: string;
  readonly apellidos: string;
  readonly tipoIdentificacion: TipoDocumentoIdentidad;
  readonly numeroIdentificacion: string;
  readonly telefono: string;
  readonly correo: string;
  readonly ocupacion?: string;
  readonly ciudadExpedicion?: string;
  readonly direccionNotificacion?: string;
  readonly tipoPersona?: TipoPersonaContrato;
  readonly representanteLegal?: RepresentanteLegalContrato;
  readonly apoderado?: ApoderadoContrato;
}

/** Paso 3: datos del inmueble (Req 30.4). */
export interface DatosInmueble {
  readonly tipoInmueble: string;
  readonly uso: string;
  readonly direccionCompleta: string;
  readonly ciudad: string;
  readonly matriculaInmobiliaria: string;
  readonly estrato?: number;
  readonly areaMetrosCuadrados?: number;
  /** Solo para validar en el front: el inmueble está en leasing y hay permiso de subarriendo. */
  readonly leasing?: boolean;
  readonly permisoSubarriendo?: boolean;
  readonly lineaTelefonica?: string; // opcional
  readonly garaje?: string; // número del garaje, si tiene
  readonly deposito?: string; // número del depósito, si tiene
  /** Círculo registral (Oficina de Registro de Instrumentos Públicos) que figura en el CTL. */
  readonly oficinaRegistro?: string;
  readonly departamento?: string;
  readonly municipio?: string;
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
  readonly metodoPago: MetodoPagoContrato;
  readonly tipoCuenta?: string;
  readonly numeroCuenta?: string;            // obligatorio salvo pago en efectivo
  readonly banco?: string;
}

/** Resultado de validar un Certificado de Tradición y Libertad (CTL) en el servidor. */
export interface ValidacionCtl {
  readonly vigente: boolean;
  /** Días desde la impresión del certificado; `null` si no se pudo determinar. */
  readonly antiguedadDias: number | null;
  readonly fechaImpresion: string | null;
  readonly motivo: 'vigente' | 'supera_antiguedad' | 'fecha_no_determinada';
  readonly departamento: string | null;
  readonly municipio: string | null;
  readonly direccion: string | null;
  readonly matricula: string | null;
  /** `null` cuando no hay dirección del contrato con la que comparar. */
  readonly direccionCoincide: boolean | null;
  readonly departamentoBloqueado: boolean;
  /** Círculo registral del CTL. */
  readonly oficinaRegistro?: string | null;
  /** Titulares del dominio: «NOMBRE - TIPO NUMERO» separados por « | ». */
  readonly titulares?: string | null;
  readonly tipoPredio?: string | null;
  readonly area?: string | null;
}

/** Formatos de descarga del contrato (siempre un archivo individual, nunca .zip). */
export type FormatoContrato = 'pdf' | 'docx';

/** Métodos de pago del canon (la cuenta bancaria es obligatoria salvo efectivo). */
export type MetodoPagoContrato = 'transferencia' | 'efectivo';

/** Solicitud completa de generación del Contrato_Arrendamiento (Req 30.7). */
export interface ContratoArrendamientoRequest {
  readonly arrendador: DatosArrendador;
  readonly arrendatario: DatosArrendatario;
  readonly inmueble: DatosInmueble;
  readonly condiciones: CondicionesEconomicas;
  /** Cotización de origen (COT-…), si el contrato nace de "Radicar esta cotización". */
  readonly cotizacionReferencia?: string;
  /** Deudores solidarios (máximo dos, precargados del estudio digital). */
  readonly deudores?: readonly DeudorSolidario[];
  /** Otros propietarios del inmueble (máximo tres además del arrendador). */
  readonly coarrendadores?: readonly DatosArrendador[];
  /** Leasing, titular de la cuenta, cláusulas adicionales y modalidad de firma (columnas AP–AV del Consolidado). */
  readonly adicionales?: {
    readonly leasing: boolean;
    readonly arrendadorEsTitular: boolean;
    readonly nombreTitular?: string;
    readonly tieneClausulas: boolean;
    readonly clausulas?: string;
    readonly tipoFirma?: string;
    /** Número de solicitud del estudio digital (pie «Solicitud» del contrato). */
    readonly numeroSolicitud?: string;
  };
}

/** Persona extraída de un contrato cargado (propuesta: el broker la confirma o corrige). */
/** Deudor solidario (codeudor) del contrato. */
export interface DeudorSolidario {
  nombres: string;
  apellidos: string;
  tipoIdentificacion: string;
  numeroIdentificacion: string;
  ciudadExpedicion: string;
  direccionNotificacion: string;
  telefono: string;
  correo: string;
}

/** Persona que devuelve el estudio digital para precargar el contrato. */
export interface PersonaEstudio {
  readonly nombres: string | null;
  readonly apellidos: string | null;
  readonly tipoIdentificacion: string | null;
  readonly numeroIdentificacion: string | null;
  readonly telefono: string | null;
  readonly correo: string | null;
  readonly direccionNotificacion: string | null;
  readonly fechaExpedicion?: string | null;
  readonly ocupacion?: string | null;
  readonly tipoPerfil?: string | null;
  readonly representanteLegal?: boolean | null;
  /** PN (natural) o PJ (jurídica). */
  readonly tipoPersona?: string | null;
}

/** Precarga del contrato desde el estudio digital (`GET /contratos/prellenado`). */
export interface PrellenadoContrato {
  readonly consecutivo: string | null;
  readonly estado: string | null;
  /** Siempre nulo: el estudio no trae al propietario (sale del CTL). */
  readonly arrendador: PersonaEstudio | null;
  readonly arrendatario: PersonaEstudio | null;
  /** Inmobiliaria que radicó el estudio (el «realState» del API); no es el propietario. */
  readonly inmobiliaria?: PersonaEstudio | null;
  readonly deudores: readonly PersonaEstudio[];
  readonly inmueble: {
    readonly direccion: string | null;
    readonly ciudad: string | null;
    readonly uso: string | null;
    readonly tipoInmueble: string | null;
    readonly canon: string | null;
    readonly administracion: string | null;
    readonly administracionIncluida?: boolean | null;
  } | null;
}

export interface ParteLeida {
  readonly nombres?: string;
  readonly apellidos?: string;
  readonly tipoIdentificacion?: TipoDocumentoIdentidad;
  readonly numeroIdentificacion?: string;
  readonly telefono?: string;
  readonly correo?: string;
  readonly direccion?: string;
}

/**
 * Resultado de `POST /contratos/lectura` (Gemini en Vertex AI, vía backend). Lo que no se encontró
 * queda vacío y se lista en `falta`: es mejor una casilla vacía que una llena con el dato de otro.
 */
export interface LecturaContratoResponse {
  /** El lector vio las firmas de arrendador y arrendatario (indicio; el área lo confirma). */
  readonly firmado?: boolean;
  readonly arrendador: ParteLeida;
  readonly arrendatario: ParteLeida;
  readonly deudorSolidario?: ParteLeida;
  readonly inmueble: {
    readonly direccionCompleta?: string;
    readonly ciudad?: string;
    readonly tipoInmueble?: string;
    readonly uso?: string;
    readonly matriculaInmobiliaria?: string;
  };
  readonly condiciones: {
    readonly canonMensual?: number;
    readonly cuotaAdministracion?: number;
    readonly fechaInicio?: string;
    readonly duracionMeses?: number;
    readonly tipoCuenta?: string;
    readonly numeroCuenta?: string;
    readonly banco?: string;
  };
  /** Campos que no se encontraron (etiquetas legibles). */
  readonly falta: readonly string[];
}
