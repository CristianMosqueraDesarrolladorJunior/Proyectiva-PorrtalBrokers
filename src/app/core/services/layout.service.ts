import { Injectable, signal } from '@angular/core';

const CLAVE_SIDEBAR = 'portal-brokers.sidebar-colapsado';

/**
 * Estado del layout compartido por los shells (broker y consola admin).
 *
 * - `sidebarColapsado`: en desktop el sidebar se reduce a un riel de iconos.
 *   La preferencia del usuario se recuerda en `localStorage` (solo un booleano,
 *   nunca datos de sesión).
 * - `pantallaCompleta`: la vista activa ocupa todo el área de contenido, sin
 *   paddings (lo usa el Agente IA).
 */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  private readonly _sidebarColapsado = signal(leerPreferencia());
  private readonly _pantallaCompleta = signal(false);

  readonly sidebarColapsado = this._sidebarColapsado.asReadonly();
  readonly pantallaCompleta = this._pantallaCompleta.asReadonly();

  /** Alterna el sidebar y recuerda la preferencia del usuario. */
  alternarSidebar(): void {
    const valor = !this._sidebarColapsado();
    this._sidebarColapsado.set(valor);
    guardarPreferencia(valor);
  }

  /**
   * Fija el estado del sidebar sin tocar la preferencia guardada (para vistas
   * que lo colapsan temporalmente, como el Agente IA).
   */
  fijarSidebarTemporal(colapsado: boolean): void {
    this._sidebarColapsado.set(colapsado);
  }

  /** Restablece el sidebar a la preferencia guardada del usuario. */
  restaurarSidebar(): void {
    this._sidebarColapsado.set(leerPreferencia());
  }

  fijarPantallaCompleta(activa: boolean): void {
    this._pantallaCompleta.set(activa);
  }
}

function leerPreferencia(): boolean {
  try {
    return localStorage.getItem(CLAVE_SIDEBAR) === '1';
  } catch {
    return false;
  }
}

function guardarPreferencia(colapsado: boolean): void {
  try {
    localStorage.setItem(CLAVE_SIDEBAR, colapsado ? '1' : '0');
  } catch {
    // Almacenamiento no disponible (modo privado): la preferencia no persiste.
  }
}
