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
  /** Acuerdo de comisión (20 o 25 %); ausente mientras el backend no lo exponga. */
  readonly porcentajeComision?: number;
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
  /** Estado de gestión (`cat_estado_solicitud`): `RADICADA`, `EN_GESTION`, …, `EXPEDIDA`. */
  readonly estado?: string | null;
  /** Póliza expedida (13 dígitos) cuando el negocio ya se emitió. */
  readonly numeroPoliza?: string | null;
}

