import { Injectable, Signal, computed, signal } from '@angular/core';
import { PerfilBroker } from '../models/broker.model';

/**
 * Estado de sesión del Broker autenticado en el cliente.
 *
 * Seguridad (Req 28.1): el Token_Sesion vive únicamente en una cookie `HttpOnly`
 * emitida por el backend y nunca es accesible desde JavaScript. Este servicio NO
 * almacena token ni PII en `localStorage`/`sessionStorage`; solo mantiene el
 * `PerfilBroker` en memoria mediante un signal de Angular, que se pierde al
 * recargar la página y debe rehidratarse consultando `GET /api/v1/auth/session`.
 *
 * `AuthService` (tarea 3.6) es quien invoca `establecerPerfil`/`limpiarPerfil`
 * tras un login o logout exitoso.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  /** Perfil del Broker autenticado, solo en memoria (sin persistencia en el navegador). */
  private readonly _perfil = signal<PerfilBroker | null>(null);

  /** Perfil del Broker autenticado expuesto como signal de solo lectura (Req 4.3). */
  readonly perfil: Signal<PerfilBroker | null> = this._perfil.asReadonly();

  /** Estado de autenticación derivado de la presencia del perfil (Req 4.4). */
  readonly autenticado: Signal<boolean> = computed(() => this._perfil() !== null);

  /**
   * Establece el perfil del Broker tras un login exitoso.
   * @param perfil perfil del Broker autenticado (nombre y rol).
   */
  establecerPerfil(perfil: PerfilBroker): void {
    this._perfil.set(perfil);
  }

  /** Limpia el perfil del Broker al cerrar sesión o al invalidarse la sesión. */
  limpiarPerfil(): void {
    this._perfil.set(null);
  }
}
