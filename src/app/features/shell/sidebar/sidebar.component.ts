import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { SessionService } from '../../../core/services/session.service';

/**
 * Acceso de navegación del sidebar del Shell_Aplicacion (Req 4.1).
 *
 * `ruta` es el segmento relativo bajo `/app` (cableado de rutas en la tarea 16.2);
 * `icono` es el glifo del prototipo y `etiqueta` el texto visible del acceso.
 */
export interface AccesoSidebar {
  readonly ruta: string;
  readonly icono: string;
  readonly etiqueta: string;
}

/**
 * Accesos del sidebar en el orden exacto del prototipo (Req 4.1):
 * Seguimiento, Nueva radicación, Referir cliente, Estado referidos, Cotizador,
 * Renovaciones, Calendario, Documentos y Ayuda.
 *
 * Cada `ruta` corresponde al mapa de enrutamiento del diseño (`/app/<ruta>`),
 * cuyo cableado con `loadComponent`/`authGuard` se realiza en la tarea 16.2.
 */
export const ACCESOS_SIDEBAR: readonly AccesoSidebar[] = [
  { ruta: 'seguimiento', icono: '◻', etiqueta: 'Seguimiento' },
  { ruta: 'radicacion', icono: '+', etiqueta: 'Nueva radicación' },
  { ruta: 'referidos', icono: '↗', etiqueta: 'Referir cliente' },
  { ruta: 'estado-referidos', icono: '📊', etiqueta: 'Estado referidos' },
  { ruta: 'cotizador', icono: '⚡', etiqueta: 'Cotizador' },
  { ruta: 'renovaciones', icono: '♻', etiqueta: 'Renovaciones' },
  { ruta: 'calendario', icono: '📅', etiqueta: 'Calendario' },
  { ruta: 'documentos', icono: '◈', etiqueta: 'Documentos' },
  { ruta: 'ayuda', icono: '?', etiqueta: 'Ayuda' },
] as const;

/**
 * SidebarComponent — barra lateral de navegación del Shell_Aplicacion (Req 4).
 *
 * Encapsula el marcado del prototipo `sidebar` con `sidebar-profile` (incluido el
 * `avatar`), `sidebar-nav` con los `nav-item` de cada acceso y `sidebar-footer`.
 *
 * Muestra el perfil del Broker autenticado —nombre y rol— obtenido del
 * `SessionService` (Req 4.3); el avatar presenta las iniciales derivadas del
 * nombre. Marca el acceso activo con `routerLinkActive` (Req 4.2), de modo que la
 * sección visible en el `main-content` quede resaltada en el sidebar.
 *
 * Standalone + `inject()`; estilos únicamente vía Design_Token. La navegación se
 * resuelve por enrutamiento (rutas relativas a `/app`), sin lógica de negocio en
 * la presentación.
 *
 * Estrategia responsiva (Req 36.3, 36.5): en tablet/móvil el sidebar colapsa a un
 * cajón (drawer) controlado por el `ShellComponent` mediante la entrada `abierto`.
 * Conserva TODOS los accesos (Req 4.1) en cada breakpoint; al seleccionar un
 * acceso o pulsar el cierre, emite `cerrar` para plegar el cajón. El foco visible
 * y los atributos ARIA se mantienen en todos los tamaños (Req 27, 36.6).
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  private readonly session = inject(SessionService);

  /**
   * Indica si el cajón del sidebar está abierto en tablet/móvil (Req 36.5).
   * En desktop el sidebar es siempre visible; esta entrada solo afecta a los
   * breakpoints donde el sidebar se presenta como cajón (drawer).
   */
  @Input() abierto = false;

  /**
   * Emite cuando el sidebar debe plegarse en tablet/móvil (Req 36.5): al pulsar
   * el control de cierre o al seleccionar un acceso de navegación.
   */
  @Output() readonly cerrar = new EventEmitter<void>();

  /** Accesos del sidebar en el orden del prototipo (Req 4.1). */
  protected readonly accesos = ACCESOS_SIDEBAR;

  /** Perfil del Broker autenticado (nombre y rol) para el `sidebar-profile` (Req 4.3). */
  protected readonly perfil = this.session.perfil;

  /** Solicita plegar el cajón del sidebar en tablet/móvil (Req 36.5). */
  protected solicitarCierre(): void {
    this.cerrar.emit();
  }

  /**
   * Devuelve las iniciales del Broker para el `avatar` del `sidebar-profile`.
   *
   * Toma la primera letra de las dos primeras palabras del nombre; si no hay
   * perfil o nombre, devuelve una cadena vacía para no exponer datos por defecto.
   *
   * @param nombre nombre completo del Broker autenticado.
   * @returns iniciales en mayúsculas (máximo 2 caracteres).
   */
  protected iniciales(nombre: string | undefined): string {
    return calcularIniciales(nombre);
  }
}

/**
 * Calcula las iniciales de un nombre completo. Función pura y total.
 *
 * @param nombre nombre completo del Broker; puede ser `undefined`.
 * @returns hasta 2 iniciales en mayúsculas; cadena vacía si no hay nombre.
 */
export function calcularIniciales(nombre: string | undefined): string {
  const partes = (nombre ?? '')
    .trim()
    .split(/\s+/)
    .filter((parte) => parte.length > 0);
  return partes
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join('');
}
