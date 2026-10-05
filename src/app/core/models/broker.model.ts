/**
 * Modelos del Broker y de autenticación (Req 1, 4).
 * La validación de cédula/contraseña en el cliente es por UX; el backend revalida (Req 1.4, 1.5).
 */

/** Estado del Broker en la Base_Brokers (Req 1). */
export type EstadoBroker = 'activo' | 'pendiente' | 'inactivo';

/**
 * Rol del usuario autenticado. Broker usa `/app`; Administrador y Comercial
 * usan la consola `/admin`. El backend es quien autoriza de verdad.
 */
export type Rol = 'Broker' | 'Administrador' | 'Comercial';

/** Perfil del usuario autenticado mostrado en el Shell_Aplicacion (Req 4.3). */
export interface PerfilBroker {
  readonly nombre: string;
  readonly rol: Rol;
  /** Solo para el rol Comercial: su cartera. */
  readonly comercialId?: string;
}

/** Credenciales de login del Broker (Req 1.1, 1.4). */
export interface LoginRequest {
  readonly cedula: string;        // 6–10 dígitos (validación cliente)
  readonly password: string;      // no vacío
}
