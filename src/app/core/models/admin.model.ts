import type { EstadoCuenta } from './cuenta.model';

/**
 * Modelos de la consola de administración (diagrama 16).
 *
 * Datos de la operación: comerciales, brokers asignados y sus negocios
 * (solicitudes radicadas). No incluyen datos del cliente/inquilino.
 */

/** Estados documentales reales del Warehouse. */
export const ESTADOS_NEGOCIO = [
  'Expedido',
  'Pendiente Validación Documental',
  'Pendiente Corrección Documental',
  'Desistido',
] as const;

export type EstadoNegocio = (typeof ESTADOS_NEGOCIO)[number] | string;

export interface Comercial {
  readonly id: string;
  readonly nombre: string;
  readonly activo: boolean;
  /** Tiene usuario para entrar a la consola. */
  readonly conAcceso: boolean;
  readonly cedula?: string;
  readonly correo?: string;
  /** `csv` si vino del Warehouse, `consola` si lo creó un administrador. */
  readonly origen: 'csv' | 'consola';
}

export interface BrokerAdmin {
  readonly id: string;
  readonly nombre: string;
  readonly tipo: 'Broker' | 'Inmobiliaria';
  readonly celular: string;
  readonly correo: string;
  readonly comercialId: string;
}

export interface Negocio {
  readonly codigo: string;
  /** ISO local, p. ej. 2025-01-31T11:35:15. */
  readonly fecha: string;
  readonly brokerId: string;
  readonly estado: EstadoNegocio;
  readonly valorAsegurado: number;
  readonly valorPoliza: number;
  readonly ciudad: string;
  readonly destino: string;
  readonly poliza: string;
  readonly asesor: string;
  readonly ultimaGestion: string;
  readonly horasGestion: number;
}

/** Archivo `mock/admin-cartera.json` generado desde el CSV. */
export interface CarteraMock {
  readonly generado: string;
  readonly fuente: string;
  readonly comerciales: readonly { readonly id: string; readonly nombre: string }[];
  readonly brokers: readonly BrokerAdmin[];
  readonly negocios: readonly Negocio[];
}

/** Indicadores de un conjunto de negocios. */
export interface Indicadores {
  readonly negocios: number;
  readonly expedidos: number;
  readonly pendientesValidacion: number;
  readonly pendientesCorreccion: number;
  readonly desistidos: number;
  /** Suma de "Valor Total Póliza" de los expedidos. */
  readonly primaExpedida: number;
}

/** Broker con sus indicadores, para la tabla de brokers. */
export interface BrokerResumen extends BrokerAdmin, Indicadores {
  readonly comercialNombre: string;
  readonly ultimaRadicacion: string;
  /** Estado de la Cuenta (Prospecto / Registrado) — mock hasta tener `/api/v1/admin`. */
  readonly estadoCuenta: EstadoCuenta;
  /** Documentos de registro aportados (de 4). */
  readonly documentosAportados: number;
}

/** Comercial con los indicadores de su cartera. */
export interface ComercialResumen extends Comercial, Indicadores {
  readonly brokers: number;
  readonly brokersActivos90d: number;
}

export interface FiltrosBrokers {
  readonly busqueda?: string;
  readonly comercialId?: string;
  readonly tipo?: 'Broker' | 'Inmobiliaria' | '';
  readonly estadoCuenta?: EstadoCuenta | '';
  readonly soloConPendientes?: boolean;
}

export interface FiltrosNegocios {
  readonly busqueda?: string;
  readonly comercialId?: string;
  readonly brokerId?: string;
  readonly estado?: string;
  readonly desde?: string;
  readonly hasta?: string;
}

export interface Pagina<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly pagina: number;
  readonly tamano: number;
}

/** Datos para crear un comercial o su acceso. */
export interface DatosAccesoComercial {
  readonly nombre: string;
  readonly cedula: string;
  readonly correo: string;
}
