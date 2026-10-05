import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';

import type { Notificacion } from '../../../core/models/notificacion.model';
import { IconComponent } from '../icon/icon.component';

/**
 * Barra superior del shell ("Proyectiva Broker Nexus"): menú (tablet/móvil),
 * buscador global con atajo Ctrl/⌘+K, estado de conexión y notificaciones.
 * El perfil del bróker vive en el sidebar. Es presentacional: el shell decide
 * qué hacer con `buscar`, `menu` y las acciones de notificaciones.
 */
@Component({
  selector: 'app-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <header class="tb">
      <button
        type="button"
        class="tb__menu"
        aria-label="Abrir o cerrar el menú de navegación"
        [attr.aria-expanded]="menuAbierto"
        aria-controls="sidebar-navegacion"
        (click)="menu.emit()"
      >
        <app-icon nombre="menu" [tamano]="22" />
      </button>

      <form class="tb__buscador" role="search" (submit)="enviar($event)">
        <app-icon nombre="search" [tamano]="20" />
        <input
          #entrada
          type="search"
          class="tb__input"
          name="busqueda-global"
          placeholder="Buscar póliza, cliente, NIT o canon..."
          aria-label="Buscar póliza, cliente, NIT o canon"
          autocomplete="off"
        />
        <kbd class="tb__atajo" aria-hidden="true">Ctrl K</kbd>
      </form>

      <span class="tb__estado">
        <span class="tb__estado-dot" aria-hidden="true"></span>
        En línea
      </span>

      <div class="tb__notif">
        <button
          type="button"
          class="tb__icono"
          aria-haspopup="dialog"
          [attr.aria-expanded]="panelAbierto()"
          [attr.aria-label]="'Notificaciones' + (noLeidas() > 0 ? ', ' + noLeidas() + ' sin leer' : '')"
          (click)="alternarPanel()"
        >
          <app-icon nombre="notifications" [tamano]="22" />
          @if (noLeidas() > 0) {
            <span class="tb__badge" aria-hidden="true">{{ noLeidas() > 9 ? '9+' : noLeidas() }}</span>
          }
        </button>

        @if (panelAbierto()) {
          <section class="np" role="dialog" aria-label="Notificaciones">
            <header class="np__cab">
              <h2 class="np__titulo">Notificaciones</h2>
              @if (noLeidas() > 0) {
                <button type="button" class="np__marcar" (click)="marcarTodas.emit()">
                  Marcar todas como leídas
                </button>
              }
            </header>

            @if (notificaciones.length === 0) {
              <p class="np__vacio">No tienes notificaciones por ahora.</p>
            } @else {
              <ul class="np__lista">
                @for (n of notificaciones; track n.id) {
                  <li>
                    <button
                      type="button"
                      class="np__item"
                      [class.np__item--leida]="n.leida"
                      (click)="elegir(n)"
                    >
                      <span class="np__punto" [attr.data-tono]="n.tono" aria-hidden="true"></span>
                      <span class="np__texto">
                        <strong>{{ n.titulo }}</strong>
                        <span>{{ n.detalle }}</span>
                      </span>
                    </button>
                  </li>
                }
              </ul>
            }
          </section>
        }
      </div>
    </header>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .tb {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        height: var(--topbar-height);
        padding: 0 var(--space-6);
        background: var(--sb-surface);
        border-bottom: 1px solid var(--sb-border);
        box-shadow: var(--sb-shadow-1);
      }
      .tb__menu {
        display: none;
        align-items: center;
        justify-content: center;
        width: var(--menu-button-size);
        height: var(--menu-button-size);
        border: none;
        border-radius: var(--radius-md);
        background: transparent;
        color: var(--sb-on-surface);
        cursor: pointer;
      }
      .tb__buscador {
        flex: 1;
        max-width: 480px;
        display: flex;
        align-items: center;
        gap: var(--space-2);
        height: var(--control-height);
        padding: 0 var(--space-3);
        background: var(--sb-surface-low);
        border: 1px solid transparent;
        border-radius: var(--radius-lg);
        color: var(--sb-secondary);
      }
      .tb__buscador:focus-within {
        border-color: var(--sb-primary);
        box-shadow: 0 0 0 3px var(--sb-primary-fixed);
      }
      .tb__input {
        flex: 1;
        min-width: 0;
        border: none;
        outline: none;
        background: transparent;
        color: var(--sb-on-surface);
        font-size: var(--text-body);
      }
      .tb__atajo {
        padding: 0 var(--space-2);
        border-radius: var(--radius-sm);
        background: var(--sb-surface-container);
        color: var(--sb-secondary);
        font-family: var(--font-family-body);
        font-size: var(--text-caption);
        font-weight: var(--font-weight-bold);
      }
      .tb__estado {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        margin-left: auto;
        padding: var(--space-1) var(--space-3);
        border-radius: var(--radius-pill);
        background: var(--sb-tint-success-bg);
        color: var(--sb-tertiary);
        font-size: var(--text-caption);
        font-weight: var(--font-weight-semibold);
      }
      .tb__estado-dot {
        width: 8px;
        height: 8px;
        border-radius: var(--radius-full);
        background: var(--sb-tertiary-container);
      }
      .tb__notif {
        position: relative;
      }
      .tb__icono {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--menu-button-size);
        height: var(--menu-button-size);
        border: none;
        border-radius: var(--radius-full);
        background: transparent;
        color: var(--sb-secondary);
        cursor: pointer;
      }
      .tb__icono:hover,
      .tb__icono[aria-expanded='true'] {
        background: var(--sb-surface-low);
        color: var(--sb-on-surface);
      }
      .tb__badge {
        position: absolute;
        top: 2px;
        right: 0;
        min-width: 16px;
        height: 16px;
        padding: 0 4px;
        border-radius: var(--radius-pill);
        background: var(--sb-primary-hover);
        color: var(--sb-on-primary);
        font-size: var(--text-caption);
        font-weight: var(--font-weight-bold);
        line-height: 16px;
        text-align: center;
        border: 2px solid var(--sb-surface);
        box-sizing: content-box;
      }
      .tb__menu:focus-visible,
      .tb__icono:focus-visible {
        outline: var(--focus-ring-width) solid var(--color-focus-ring);
        outline-offset: var(--focus-ring-offset);
      }

      /* Panel de notificaciones */
      .np {
        position: absolute;
        top: calc(100% + var(--space-2));
        right: 0;
        z-index: var(--z-topbar);
        width: 360px;
        max-height: 70vh;
        overflow-y: auto;
        background: var(--sb-surface);
        border: 1px solid var(--sb-border);
        border-radius: var(--radius-xl);
        box-shadow: var(--sb-shadow-3);
      }
      .np__cab {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-3);
        padding: var(--space-3) var(--space-4);
        border-bottom: 1px solid var(--sb-border);
      }
      .np__titulo {
        margin: 0;
        font-size: var(--text-body);
        font-weight: var(--font-weight-semibold);
        color: var(--sb-on-surface);
      }
      .np__marcar {
        border: none;
        background: transparent;
        color: var(--sb-primary-hover);
        font-size: var(--text-caption);
        font-weight: var(--font-weight-semibold);
        cursor: pointer;
      }
      .np__marcar:hover {
        text-decoration: underline;
      }
      .np__vacio {
        margin: 0;
        padding: var(--space-6) var(--space-4);
        text-align: center;
        color: var(--sb-secondary);
        font-size: var(--text-body-sm);
      }
      .np__lista {
        list-style: none;
        margin: 0;
        padding: var(--space-1);
      }
      .np__item {
        width: 100%;
        display: flex;
        align-items: flex-start;
        gap: var(--space-3);
        padding: var(--space-3);
        border: none;
        border-radius: var(--radius-lg);
        background: transparent;
        text-align: left;
        cursor: pointer;
      }
      .np__item:hover {
        background: var(--sb-surface-low);
      }
      .np__item--leida .np__texto strong {
        font-weight: var(--font-weight-medium);
        color: var(--sb-secondary);
      }
      .np__punto {
        flex-shrink: 0;
        width: 8px;
        height: 8px;
        margin-top: 6px;
        border-radius: var(--radius-full);
        background: var(--sb-info);
      }
      .np__punto[data-tono='alerta'] {
        background: var(--sb-error);
      }
      .np__punto[data-tono='exito'] {
        background: var(--sb-tertiary-container);
      }
      .np__texto {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .np__texto strong {
        font-size: var(--text-body);
        color: var(--sb-on-surface);
      }
      .np__texto span {
        font-size: var(--text-body-sm);
        color: var(--sb-secondary);
        line-height: var(--line-height-normal);
      }
      .np__item:focus-visible,
      .np__marcar:focus-visible {
        outline: var(--focus-ring-width) solid var(--color-focus-ring);
        outline-offset: -2px;
      }

      @media (width <= 1023px) {
        .tb {
          padding: 0 var(--space-4);
        }
        .tb__menu {
          display: inline-flex;
        }
        .tb__atajo {
          display: none;
        }
      }
      @media (width <= 639px) {
        .tb {
          gap: var(--space-2);
        }
        .tb__estado {
          display: none;
        }
        .tb__buscador {
          min-width: 0;
        }
        .tb__notif {
          margin-left: auto;
        }
        /* En móvil el panel ocupa el ancho de la pantalla, no del botón. */
        .np {
          position: fixed;
          top: calc(var(--topbar-height) + var(--space-2));
          left: var(--space-3);
          right: var(--space-3);
          width: auto;
        }
      }
    `,
  ],
})
export class TopbarComponent {
  @Input() menuAbierto = false;
  @Input() notificaciones: readonly Notificacion[] = [];

  @Output() menu = new EventEmitter<void>();
  @Output() buscar = new EventEmitter<string>();
  @Output() abrirNotificacion = new EventEmitter<Notificacion>();
  @Output() marcarTodas = new EventEmitter<void>();

  @ViewChild('entrada', { static: true }) private entrada?: ElementRef<HTMLInputElement>;

  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly panelAbierto = signal(false);

  protected noLeidas(): number {
    return this.notificaciones.filter((n) => !n.leida).length;
  }

  protected alternarPanel(): void {
    this.panelAbierto.update((abierto) => !abierto);
  }

  protected elegir(notificacion: Notificacion): void {
    this.panelAbierto.set(false);
    this.abrirNotificacion.emit(notificacion);
  }

  /** Atajo global Ctrl/⌘+K: enfoca el buscador. Esc cierra el panel de notificaciones. */
  @HostListener('document:keydown', ['$event'])
  protected onAtajo(evento: KeyboardEvent): void {
    if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 'k') {
      evento.preventDefault();
      this.entrada?.nativeElement.focus();
    }
    if (evento.key === 'Escape' && this.panelAbierto()) {
      this.panelAbierto.set(false);
    }
  }

  /** Cierra el panel al hacer clic fuera de la campana. */
  @HostListener('document:click', ['$event'])
  protected onClickFuera(evento: MouseEvent): void {
    if (this.panelAbierto() && !this.host.nativeElement.contains(evento.target as Node)) {
      this.panelAbierto.set(false);
    }
  }

  protected enviar(evento: Event): void {
    evento.preventDefault();
    const texto = this.entrada?.nativeElement.value.trim() ?? '';
    if (texto.length > 0) {
      this.buscar.emit(texto);
    }
  }
}
