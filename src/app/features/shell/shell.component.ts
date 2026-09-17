import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ChatAsistenteComponent } from '../../shared/components/chat-asistente/chat-asistente.component';
import { SidebarComponent } from './sidebar/sidebar.component';

/**
 * ShellComponent — Shell_Aplicacion del Portal (Req 4, 38, 39.5).
 *
 * Compone el layout autenticado del prototipo: `app-wrapper` que contiene el
 * `SidebarComponent` (navegación y perfil del Broker, Req 4) y el `main-content`
 * con un `<router-outlet />` donde se renderiza la sección activa (Req 4.2).
 *
 * El `ChatAsistenteComponent` (Chat_Asistente) se monta a nivel del shell, fuera
 * del `router-outlet`, de modo que permanece persistente y accesible sobre todas
 * las secciones del Shell_Aplicacion (Req 38.1, 39.5). El acceso a `/app/*` se
 * protege con `authGuard` y el enrutamiento diferido se cablea en `app.routes.ts`.
 *
 * Estrategia responsiva (Req 36.3, 36.5, 36.6): en tablet/móvil, una barra
 * superior con botón de menú alterna la visibilidad del `SidebarComponent`
 * (presentado como cajón) mediante la señal `sidebarAbierto`; un `overlay`
 * permite cerrarlo. Se preserva TODA la navegación y funcionalidad en cada
 * breakpoint (los breakpoints son Design_Token, sin valores hardcodeados) y el
 * `chat-fab` permanece siempre accesible por encima del layout. En desktop el
 * sidebar es fijo y el botón de menú/overlay quedan ocultos por CSS.
 *
 * Standalone + composición por reutilización de Componentes_Compartidos; estilos
 * únicamente vía Design_Token. No contiene lógica de negocio.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SidebarComponent, ChatAsistenteComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  /**
   * Estado de apertura del sidebar como cajón en tablet/móvil (Req 36.5).
   * En desktop el sidebar es siempre visible; esta señal no afecta al layout de
   * escritorio (el botón de menú y el overlay están ocultos por CSS).
   */
  protected readonly sidebarAbierto = signal(false);

  /** Alterna la visibilidad del cajón del sidebar en tablet/móvil (Req 36.5). */
  protected alternarSidebar(): void {
    this.sidebarAbierto.update((abierto) => !abierto);
  }

  /** Pliega el cajón del sidebar (al pulsar el overlay o navegar) (Req 36.5). */
  protected cerrarSidebar(): void {
    this.sidebarAbierto.set(false);
  }
}
