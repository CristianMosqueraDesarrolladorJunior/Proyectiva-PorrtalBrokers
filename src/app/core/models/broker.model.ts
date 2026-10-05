/**
 * Modelos del Broker y de autenticación (Req 1, 4).
 * La validación de cédula/contraseña en el cliente es por UX; el backend revalida (Req 1.4, 1.5).
 */

/** Estado del Broker en la Base_Brokers (Req 1). */
export type EstadoBroker = 'activo' | 'pendiente' | 'inactivo';

/**
 * Rol del usuario autenticado (identificador en mayúsculas emitido por el
 * backend en `GET /api/v1/auth/session`). Broker usa `/app`; Administrador y
 * Comercial usan la consola `/admin`. El backend es quien autoriza de verdad.
 */
export type Rol = 'BROKER' | 'ADMINISTRADOR' | 'COMERCIAL';

/** Estado de la Cuenta emitido por el backend. */
export type EstadoCuentaSesion = 'PROSPECTO' | 'REGISTRADO';

/**
 * Perfil del usuario autenticado mostrado en el Shell_Aplicacion (Req 4.3).
 * Refleja el `SessionResponse` del backend (`/api/v1/auth/session`, `/auth/login`).
 */
export interface PerfilBroker {
  readonly nombre: string;
  readonly rol: Rol;
  /** Solo para el rol Comercial: su cartera (`null` en otros roles). */
  readonly comercialId?: string | null;
  /** Estado de la Cuenta (`PROSPECTO` / `REGISTRADO`). */
  readonly estadoCuenta?: EstadoCuentaSesion;
  /** Módulos autorizados por la Matriz_Acceso del servidor. */
  readonly modulosPermitidos?: readonly string[];
}

/** Credenciales de login del Broker (Req 1.1, 1.4). */
export interface LoginRequest {
  readonly cedula: string;        // 6–10 dígitos (validación cliente)
  readonly password: string;      // no vacío
}
