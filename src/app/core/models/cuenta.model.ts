/**
 * Identidad única con estado (spec backend-microservicios-portal-brokers, Req 1 y 3).
 *
 * Una misma Cuenta evoluciona de `PROSPECTO` (ingreso simple, acceso
 * restringido, sin comisiones) a `REGISTRADO` (documentación completa, acceso
 * total). La autorización real la hace SIEMPRE el servidor (Req 1.9); aquí la
 * matriz solo sirve para que la UI represente el estado y el CTA de registro
 * (Req 1.11, 25.5).
 */

import type { TipoDocumentoRegistro } from './registro-broker.model';
import type { TipoDocumentoIdentidad } from './radicacion.model';

/** Estado de la Cuenta (Req 1.1). */
export type EstadoCuenta = 'PROSPECTO' | 'REGISTRADO';

/** Etiqueta visible del estado de la Cuenta. */
export const ETIQUETA_ESTADO_CUENTA: Readonly<Record<EstadoCuenta, string>> = {
  PROSPECTO: 'Prospecto',
  REGISTRADO: 'Broker registrado',
};

/** Módulo del portal según la Matriz_Acceso (rutas bajo `/app`). */
export interface ModuloPortal {
  readonly ruta: string;
  readonly etiqueta: string;
  readonly icono: string;
}

/** Modulos_Prospecto: permitidos con estado `PROSPECTO` (Req 1.3, 8.3). */
export const MODULOS_PROSPECTO: readonly ModuloPortal[] = [
  { ruta: 'seguimiento', etiqueta: 'Seguimiento', icono: 'grid_view' },
  { ruta: 'agente', etiqueta: 'Agente IA (radicación)', icono: 'smart_toy' },
  { ruta: 'radicacion', etiqueta: 'Radicación de pólizas', icono: 'post_add' },
  { ruta: 'cotizador', etiqueta: 'Cotizaciones', icono: 'calculate' },
  { ruta: 'contrato', etiqueta: 'Contratos', icono: 'description' },
  { ruta: 'documentos', etiqueta: 'Documentos', icono: 'folder_open' },
  { ruta: 'ayuda', etiqueta: 'Ayuda', icono: 'help_outline' },
];

/** Modulos_Restringido: se desbloquean al pasar a `REGISTRADO` (Req 1.4). */
export const MODULOS_RESTRINGIDOS: readonly ModuloPortal[] = [
  { ruta: 'renovaciones', etiqueta: 'Renovaciones', icono: 'update' },
  { ruta: 'referidos', etiqueta: 'Referir cliente', icono: 'person_add' },
  { ruta: 'estado-referidos', etiqueta: 'Estado de referidos', icono: 'conversion_path' },
  { ruta: 'nuevo-negocio', etiqueta: 'Nuevo negocio', icono: 'add_business' },
  { ruta: 'coberturas', etiqueta: 'Coberturas', icono: 'shield' },
  { ruta: 'calendario', etiqueta: 'Calendario', icono: 'calendar_today' },
  { ruta: 'comisiones', etiqueta: 'Dashboard de comisiones', icono: 'payments' },
];

const RUTAS_RESTRINGIDAS = new Set(MODULOS_RESTRINGIDOS.map((m) => m.ruta));

/**
 * Indica si la UI debe presentar un módulo como bloqueado para el estado dado.
 * Solo presentación: el servidor responde 403 si no está permitido (Req 1.10).
 */
export function moduloBloqueado(estado: EstadoCuenta, ruta: string): boolean {
  return estado === 'PROSPECTO' && RUTAS_RESTRINGIDAS.has(ruta);
}

/** Estado de revisión de un documento del perfil. */
export type EstadoDocumentoPerfil = 'aprobado' | 'en_revision' | 'pendiente';

export interface DocumentoPerfil {
  readonly tipo: TipoDocumentoRegistro;
  readonly estado: EstadoDocumentoPerfil;
  /** Nombre del archivo cargado (vacío si está pendiente). */
  readonly archivo: string;
  /** Fecha ISO de la última carga. */
  readonly fechaCarga: string | null;
}

/** Estado SARLAFT del broker según la antigüedad de su fecha de expedición. */
export type EstadoSarlaftPerfil = 'vigente' | 'por_vencer' | 'vencido' | 'sin_consultar';

export interface SarlaftPerfil {
  readonly estado: EstadoSarlaftPerfil;
  readonly fechaExpedicion: string | null;
  readonly ultimaConsulta: string | null;
}

/** Comisiones de solicitudes radicadas como prospecto (Req 1.7, 3.6). */
export interface ComisionesRetroactivas {
  readonly solicitudes: number;
  readonly monto: number;
  /** `true` una vez acreditadas al completar la Transicion_Registro. */
  readonly acreditadas: boolean;
}

/** Perfil de la Cuenta mostrado en "Mi perfil" (datos mock hasta tener backend). */
export interface PerfilCuenta {
  readonly id: string;
  readonly estadoCuenta: EstadoCuenta;
  /** Documento de identidad: NO modificable desde el perfil. */
  readonly tipoDocumento: TipoDocumentoIdentidad;
  readonly numeroDocumento: string;
  readonly nombreCompleto: string;
  readonly correo: string;
  readonly telefono: string;
  readonly ciudad: string;
  readonly comercialAsignado: string;
  readonly fechaIngreso: string;
  /** Fecha de la Transicion_Registro; `null` mientras es prospecto. */
  readonly fechaRegistro: string | null;
  readonly sarlaft: SarlaftPerfil;
  readonly documentos: readonly DocumentoPerfil[];
  readonly comisiones: ComisionesRetroactivas;
}

/** Datos personales editables desde el perfil (el documento no se incluye). */
export interface DatosPersonalesEditables {
  readonly nombreCompleto: string;
  readonly correo: string;
  readonly telefono: string;
  readonly ciudad: string;
}
