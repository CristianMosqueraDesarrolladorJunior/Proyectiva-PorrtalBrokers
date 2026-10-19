import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  inject,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { moduloBloqueado } from '../../../core/models/cuenta.model';
import { CatalogoService } from '../../../core/services/catalogo.service';
import { LayoutService } from '../../../core/services/layout.service';
import { MiPerfilService } from '../../../core/services/mi-perfil.service';
import { PerfilService } from '../../../core/services/perfil.service';
import { SessionService } from '../../../core/services/session.service';
import { IconComponent } from '../../../shared/components';

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
 * Accesos visibles del sidebar (Req 4.1): Seguimiento, el flujo de emisión de póliza
 * (Cotización → Contratación → Radicación) y luego Renovaciones, Comisiones, Calendario,
 * Documentos y Ayuda.
 *
 * "Agente IA", "Referir cliente" y "Estado referidos" quedan ocultos del sidebar
 * (sus rutas siguen existiendo). Cada `ruta` corresponde al mapa de enrutamiento
 * del diseño (`/app/<ruta>`).
 */
export const ACCESOS_SIDEBAR: readonly AccesoSidebar[] = [
  { ruta: 'seguimiento', icono: 'grid_view', etiqueta: 'Seguimiento' },
  // Orden del flujo de emisión: no se radica sin contrato (spec flujo-emision-poliza).
  { ruta: 'cotizador', icono: 'calculate', etiqueta: 'Cotización' },
  { ruta: 'contrato', icono: 'description', etiqueta: 'Contratación' },
  { ruta: 'radicacion', icono: 'post_add', etiqueta: 'Radicación' },
  // "Agente IA", "Referir cliente" y "Estado referidos" se ocultan del sidebar (sus rutas siguen existiendo).
  { ruta: 'renovaciones', icono: 'update', etiqueta: 'Renovaciones' },
  { ruta: 'comisiones', icono: 'payments', etiqueta: 'Comisiones' },
  { ruta: 'calendario', icono: 'calendar_today', etiqueta: 'Calendario' },
  { ruta: 'documentos', icono: 'folder_open', etiqueta: 'Documentos' },
  { ruta: 'ayuda', icono: 'help_outline', etiqueta: 'Ayuda' },
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
  imports: [RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  private readonly session = inject(SessionService);
  private readonly layout = inject(LayoutService);

  private readonly cuenta = inject(PerfilService);

  /** Estado de la Cuenta (Prospecto / Broker registrado) para el pie del sidebar. */
  protected readonly estadoCuenta = this.cuenta.estadoCuenta;
  private readonly catalogo = inject(CatalogoService);
  private readonly rutasRestringidas = this.catalogo.modulosRestringidos().map((m) => m.ruta);

  /** Etiqueta visible del estado de la Cuenta (`—` si aún no se conoce). */
  protected readonly etiquetaEstadoActual = computed<string>(() => {
    const estado = this.estadoCuenta();
    return estado ? this.catalogo.etiqueta('estado_cuenta', estado) : '—';
  });

  /** En desktop el sidebar puede plegarse a un riel de iconos. */
  protected readonly colapsado = this.layout.sidebarColapsado;

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

  /** Accesos del sidebar; por defecto los del broker (Req 4.1). */
  @Input() accesos: readonly AccesoSidebar[] = ACCESOS_SIDEBAR;

  /** Ruta base de los accesos (`/app` para el broker, `/admin` para la consola). */
  @Input() base = '/app';

  /** Subtítulo de la marca superior. */
  @Input() subtitulo = 'Portal Brokers';

  /** Muestra la tarjeta "Línea Bróker VIP" (solo tiene sentido para brokers). */
  @Input() mostrarVip = true;

  /** Muestra el botón "Cerrar sesión" en el pie. */
  @Input() conSalir = false;

  /** Emite al pulsar "Cerrar sesión". */
  @Output() readonly salir = new EventEmitter<void>();

  /** Perfil del Broker autenticado (nombre y rol) para el `sidebar-profile` (Req 4.3). */
  protected readonly perfil = this.session.perfil;

  /** Foto de perfil de la sesión (blob local); sin foto se ven las iniciales. */
  protected readonly foto = inject(MiPerfilService).foto;

  /** Solo en el portal del broker: el perfil y la Matriz_Acceso aplican a `/app`. */
  protected get esPortalBroker(): boolean {
    return this.base === '/app';
  }

  /**
   * Módulo presentado con candado mientras la Cuenta es prospecto (solo UI).
   * Si aún no se conoce el estado de la Cuenta (`null`), no se marca candado;
   * la autorización efectiva la aplica el servidor (403).
   */
  protected bloqueado(ruta: string): boolean {
    const estado = this.estadoCuenta();
    return this.esPortalBroker && estado !== null && moduloBloqueado(estado, ruta, this.rutasRestringidas);
  }

  /** Alterna el riel de iconos (solo desktop). */
  protected alternarColapso(): void {
    this.layout.alternarSidebar();
  }

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

  /** Rol legible (el usuario interno puede no tener nombre en la sesión). */
  protected etiquetaRol(rol: string | undefined): string {
    const texto = (rol ?? '').replace(/_/g, ' ').toLowerCase();
    return texto.charAt(0).toUpperCase() + texto.slice(1);
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
