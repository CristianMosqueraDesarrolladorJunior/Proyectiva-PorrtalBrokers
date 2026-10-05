/**
 * Modelos de la consola de administración (Servicio_Admin, Req 16).
 *
 * Reflejan 1:1 los DTOs de salida del backend (`/api/v1/admin/*`). El servidor
 * aplica la autorización por rol y el filtro por cartera, y enmascara la PII del
 * inquilino antes de responder; el frontend solo presenta estos campos.
 */

/** Broker de la cartera (`GET /admin/brokers`). */
export interface BrokerAdminResponse {
  readonly brokerId: string;
  readonly broker: string;
  /** `Persona natural` / `Inmobiliaria`. */
  readonly tipo: string;
  readonly comercial: string;
  readonly numeroNegocios: number;
  /** Estado SARLAFT: `ok` / `rev` / `pend`. */
  readonly estadoSarlaft: string;
  /** Estado del broker: `Activo` / `En registro` / `Inactivo`. */
  readonly estado: string;
}

/** Comercial (`GET /admin/comerciales`, `POST /admin/comerciales`). */
export interface ComercialResponse {
  readonly comercialId: string;
  readonly nombre: string;
  readonly activo: boolean;
}

/** Negocio administrado con el inquilino enmascarado (`GET /admin/negocios`). */
export interface NegocioAdminResponse {
  readonly radicado: string;
  /** Nombre del inquilino enmascarado por el backend (`A* R*`). */
  readonly inquilino: string;
  readonly broker: string;
  readonly valorAsegurado: number;
  /** Etapa: `Estudio` / `SARLAFT` / `Documentos` / `Radicado` / `Emitida`. */
  readonly etapa: string;
  /** Fecha ISO-8601 (`YYYY-MM-DD`). */
  readonly fecha: string;
}

/** Resumen de administración (`GET /admin/resumen`). */
export interface ResumenAdminResponse {
  readonly kpis: readonly KpiResponse[];
  readonly radicadosPorComercial: readonly RadicadosPorComercialResponse[];
  readonly actividadReciente: readonly ActividadRecienteResponse[];
}

/** Tarjeta de KPI del resumen. */
export interface KpiResponse {
  readonly etiqueta: string;
  readonly valor: string;
  readonly detalle: string;
  readonly alerta: boolean;
}

/** Radicados del mes por comercial (barra). */
export interface RadicadosPorComercialResponse {
  readonly comercial: string;
  readonly radicados: number;
}

/** Item de actividad reciente. */
export interface ActividadRecienteResponse {
  readonly texto: string;
  /** Fecha ISO-8601 (`YYYY-MM-DD`). */
  readonly fecha: string;
  readonly alerta: boolean;
}

/** Etapas de negocio del conjunto cerrado del backend (para el filtro de la vista Negocios). */
export const ETAPAS_NEGOCIO = ['Estudio', 'SARLAFT', 'Documentos', 'Radicado', 'Emitida'] as const;

export type EtapaNegocio = (typeof ETAPAS_NEGOCIO)[number];
