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

/** Módulo del portal según la Matriz_Acceso (rutas bajo `/app`). */
export interface ModuloPortal {
  readonly ruta: string;
  readonly etiqueta: string;
  readonly icono: string;
}

/**
 * Indica si la UI debe presentar un módulo como bloqueado para el estado dado. Los módulos restringidos al
 * prospecto vienen del catálogo `modulo_portal` (`prospecto = false`). Solo presentación: el servidor responde
 * 403 si no está permitido (Req 1.10).
 */
export function moduloBloqueado(estado: EstadoCuenta, ruta: string, restringidas: readonly string[]): boolean {
  return estado === 'PROSPECTO' && restringidas.includes(ruta);
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

/** Estado SARLAFT del broker que decide el backend (`en_cumplimiento` = CONSULTABLE, pasa a Cumplimiento). */
export type EstadoSarlaftPerfil = 'vigente' | 'por_vencer' | 'vencido' | 'en_cumplimiento' | 'fisico' | 'sin_consultar';

export interface SarlaftPerfil {
  readonly estado: EstadoSarlaftPerfil;
  readonly fechaExpedicion: string | null;
  readonly ultimaConsulta: string | null;
  /** Radicado de Cumplimiento cuando la consulta queda CONSULTABLE. */
  readonly radicadoCumplimiento?: string | null;
  /** URL del formulario de actualización cuando queda DESACTUALIZADO. */
  readonly enlaceActualizacion?: string | null;
  /** Nombre del SARLAFT físico cargado (formulario diligenciado), si lo hay. */
  readonly fisico?: string | null;
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
  /** Solicitud de legalización: SIN_SOLICITUD · RADICADA · EN_REVISION · APROBADA · RECHAZADA. */
  readonly legalizacion?: string;
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

/** Datos personales editables desde el perfil (el documento de identidad y la ciudad no se incluyen: la ciudad es dato compartido de Cien Cuadras y no es modificable desde el perfil). */
export interface DatosPersonalesEditables {
  readonly nombreCompleto: string;
  readonly correo: string;
  readonly telefono: string;
  /** Ciudad del catálogo `ciudad`; se guarda en el portal (la de Cien Cuadras es solo el valor inicial). */
  readonly ciudad?: string;
}
