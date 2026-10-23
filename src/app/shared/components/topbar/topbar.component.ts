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

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';

import type { Notificacion } from '../../../core/models/notificacion.model';
import { BusquedaService, ETIQUETA_TIPO } from '../../../core/services/busqueda.service';
import type { ResultadoBusqueda } from '../../../core/services/busqueda.service';
import { IconComponent } from '../icon/icon.component';

/**
 * Barra superior del shell ("Proyectiva Broker Nexus"): menú (tablet/móvil),
 * buscador global con atajo Ctrl/⌘+K, estado de conexión y notificaciones.
 * El perfil del bróker vive en el sidebar. El buscador consulta contratos, cotizaciones, radicaciones y
 * pólizas del alcance de la sesión y abre la vista de cada resultado; el shell decide `menu` y notificaciones.
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
          placeholder="Buscar radicación, póliza, cotización o contrato…"
          aria-label="Buscar radicación, póliza, cotización o contrato"
          autocomplete="off"
          role="combobox"
          aria-controls="tb-resultados"
          [attr.aria-expanded]="listaAbierta()"
          (input)="escribir($any($event.target).value)"
          (focus)="listaAbierta.set(texto().length >= minimo)"
          (keydown)="navegarLista($event)"
        />
        <kbd class="tb__atajo" aria-hidden="true">Ctrl K</kbd>

        @if (listaAbierta()) {
          <div class="br" id="tb-resultados" role="listbox" aria-label="Resultados de la búsqueda">
            @if (buscando() && resultados().length === 0) {
              <p class="br__vacio">Buscando…</p>
            } @else if (resultados().length === 0) {
              <p class="br__vacio">No encontramos radicaciones, pólizas, cotizaciones ni contratos con «{{ texto() }}».</p>
            } @else {
              @for (r of resultados(); track $index) {
                <button type="button" class="br__item" role="option" [attr.aria-selected]="$index === activo()"
                  [class.br__item--activo]="$index === activo()" (mousedown)="$event.preventDefault()" (click)="abrir(r)">
                  <span class="br__tipo">{{ etiquetaTipo[r.tipo] }}</span>
                  <span class="br__texto">
                    <strong>{{ r.titulo }}</strong>
                    @if (r.detalle) {
                      <span>{{ r.detalle }}</span>
                    }
                  </span>
                </button>
              }
            }
          </div>
        }
      </form>

      <ng-content />

      <span class="tb__estado">
        <span class="tb__estado-dot" aria-hidden="true"></span>
        En línea
      </span>

      @if (conNotificaciones) {
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
      }

      <img class="tb__logo" src="img/proyectiva-logo.svg" alt="Proyectiva Agencia de Seguros" />
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
      .tb__logo {
        height: var(--topbar-logo-height);
        width: auto;
        margin-left: var(--space-3);
        padding-left: var(--space-4);
        border-left: 1px solid var(--sb-border);
        box-sizing: content-box;
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
        position: relative;
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

      /* Resultados del buscador (mismo panel que las notificaciones) */
      .br {
        position: absolute;
        top: calc(100% + var(--space-2));
        left: 0;
        right: 0;
        z-index: var(--z-topbar);
        max-height: 60vh;
        overflow-y: auto;
        padding: var(--space-1);
        background: var(--sb-surface);
        border: 1px solid var(--sb-border);
        border-radius: var(--radius-xl);
        box-shadow: var(--sb-shadow-3);
      }
      .br__vacio {
        margin: 0;
        padding: var(--space-4);
        text-align: center;
        color: var(--sb-secondary);
        font-size: var(--text-body-sm);
      }
      .br__item {
        width: 100%;
        display: flex;
        align-items: flex-start;
        gap: var(--space-3);
        padding: var(--space-2) var(--space-3);
        border: none;
        border-radius: var(--radius-lg);
        background: transparent;
        text-align: left;
        cursor: pointer;
      }
      .br__item:hover,
      .br__item--activo {
        background: var(--sb-surface-low);
      }
      .br__item:focus-visible {
        outline: var(--focus-ring-width) solid var(--color-focus-ring);
        outline-offset: -2px;
      }
      .br__tipo {
        flex-shrink: 0;
        min-width: 84px;
        padding: 2px var(--space-2);
        border-radius: var(--radius-pill);
        background: var(--sb-surface-container);
        color: var(--sb-secondary);
        font-size: var(--text-caption);
        font-weight: var(--font-weight-semibold);
        text-align: center;
      }
      .br__texto {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .br__texto strong {
        font-size: var(--text-body);
        color: var(--sb-on-surface);
      }
      .br__texto span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: var(--text-body-sm);
        color: var(--sb-secondary);
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
        .tb__logo {
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
  /** La consola del área no tiene campana de notificaciones. */
  @Input() conNotificaciones = true;

  @Output() menu = new EventEmitter<void>();
  @Output() abrirNotificacion = new EventEmitter<Notificacion>();
  @Output() marcarTodas = new EventEmitter<void>();

  @ViewChild('entrada', { static: true }) private entrada?: ElementRef<HTMLInputElement>;

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly busqueda = inject(BusquedaService);
  private readonly router = inject(Router);

  protected readonly panelAbierto = signal(false);

  // --- Buscador global ---
  protected readonly minimo = BusquedaService.MINIMO;
  protected readonly etiquetaTipo = ETIQUETA_TIPO;
  protected readonly texto = signal('');
  protected readonly resultados = signal<readonly ResultadoBusqueda[]>([]);
  protected readonly buscando = signal(false);
  protected readonly listaAbierta = signal(false);
  protected readonly activo = signal(-1);
  private readonly consultas = new Subject<string>();

  constructor() {
    this.consultas
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((q) => this.busqueda.buscar(q).pipe(catchError(() => of([] as readonly ResultadoBusqueda[])))),
        takeUntilDestroyed(),
      )
      .subscribe((r) => {
        this.resultados.set(r);
        this.buscando.set(false);
        this.activo.set(r.length ? 0 : -1);
      });
  }

  protected escribir(valor: string): void {
    const q = valor.trim();
    this.texto.set(q);
    this.listaAbierta.set(q.length >= this.minimo);
    if (q.length >= this.minimo) {
      this.buscando.set(true);
      this.resultados.set([]);
    }
    this.consultas.next(q);
  }

  /** Flechas para moverse por los resultados, Enter abre el elegido y Esc cierra la lista. */
  protected navegarLista(evento: KeyboardEvent): void {
    const total = this.resultados().length;
    if (evento.key === 'ArrowDown' && total) {
      evento.preventDefault();
      this.activo.update((i) => (i + 1) % total);
    } else if (evento.key === 'ArrowUp' && total) {
      evento.preventDefault();
      this.activo.update((i) => (i - 1 + total) % total);
    } else if (evento.key === 'Escape') {
      this.listaAbierta.set(false);
    }
  }

  protected abrir(r: ResultadoBusqueda): void {
    const { ruta, q } = this.busqueda.destino(r);
    this.listaAbierta.set(false);
    this.entrada?.nativeElement.blur();
    void this.router.navigate([ruta], { queryParams: q ? { q } : {} });
  }

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

  /** Cierra la campana y la lista de resultados al hacer clic fuera de la barra. */
  @HostListener('document:click', ['$event'])
  protected onClickFuera(evento: MouseEvent): void {
    if (!this.host.nativeElement.contains(evento.target as Node)) {
      this.panelAbierto.set(false);
      this.listaAbierta.set(false);
    }
  }

  /** Enter abre el resultado resaltado. */
  protected enviar(evento: Event): void {
    evento.preventDefault();
    const elegido = this.resultados()[this.activo()];
    if (elegido) this.abrir(elegido);
  }
}
