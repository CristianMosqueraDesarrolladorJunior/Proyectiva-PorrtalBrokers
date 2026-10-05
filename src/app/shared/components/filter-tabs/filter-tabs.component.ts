import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

/** Color del conteo (badge) de una pestaña de filtro. */
export type ColorFilterTab = 'error' | 'primary';

/** Pestaña de filtro del sistema stitch. */
export interface FilterTab {
  /** Identificador único de la pestaña. */
  id: string;
  /** Etiqueta visible. */
  label: string;
  /** Conteo opcional mostrado como badge. */
  conteo?: number;
  /** Color del badge de conteo. */
  color?: ColorFilterTab;
}

/**
 * FilterTabsComponent — Pestañas de filtro del sistema "Proyectiva Broker Nexus" (stitch).
 *
 * Renderiza una barra de pestañas con conteo opcional y soporta two-way binding
 * `[(activa)]` mediante `@Input() activa` / `@Output() activaChange`. Usa
 * `role="tablist"`/`role="tab"`, navegación por teclado (flechas) y foco visible.
 *
 * Uso:
 * ```html
 * <app-filter-tabs [tabs]="tabs" [(activa)]="tabActiva" />
 * ```
 */
@Component({
  selector: 'app-filter-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ft" role="tablist">
      @for (tab of tabs; track tab.id; let i = $index) {
        <button
          type="button"
          class="ft__tab"
          role="tab"
          [class.ft__tab--activa]="tab.id === activa"
          [attr.aria-selected]="tab.id === activa"
          [attr.tabindex]="tab.id === activa ? 0 : -1"
          (click)="seleccionar(tab.id)"
          (keydown)="onKeydown($event, i)"
        >
          {{ tab.label }}
          @if (tab.conteo !== undefined) {
            <span class="ft__conteo" [attr.data-color]="tab.color ?? 'primary'">{{ tab.conteo }}</span>
          }
        </button>
      }
    </div>
  `,
  styles: [
    `
      .ft {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-1);
        padding: var(--space-1);
        background: var(--sb-surface-low);
        border-radius: var(--radius-pill);
      }
      .ft__tab {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-2) var(--space-4);
        border: none;
        border-radius: var(--radius-pill);
        background: transparent;
        color: var(--sb-secondary);
        font-family: var(--font-family-body);
        font-size: var(--text-body);
        font-weight: var(--font-weight-medium);
        cursor: pointer;
        transition: background 0.15s ease, color 0.15s ease;
      }
      .ft__tab:hover {
        color: var(--sb-on-surface);
      }
      .ft__tab--activa {
        background: var(--sb-surface);
        color: var(--sb-on-surface);
        font-weight: var(--font-weight-semibold);
        box-shadow: var(--sb-shadow-1);
      }
      .ft__tab:focus-visible {
        outline: var(--focus-ring-width) solid var(--color-focus-ring);
        outline-offset: var(--focus-ring-offset);
      }
      .ft__conteo {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: var(--space-5);
        padding: 0 var(--space-1);
        border-radius: var(--radius-pill);
        font-size: var(--text-caption);
        font-weight: var(--font-weight-bold);
        color: var(--sb-on-primary);
      }
      .ft__conteo[data-color='primary'] {
        background: var(--sb-primary);
      }
      .ft__conteo[data-color='error'] {
        background: var(--sb-error);
      }
    `,
  ],
})
export class FilterTabsComponent {
  /** Pestañas a mostrar. */
  @Input() tabs: FilterTab[] = [];

  /** Identificador de la pestaña activa (two-way `[(activa)]`). */
  @Input() activa = '';

  /** Emite el id de la pestaña seleccionada (habilita `[(activa)]`). */
  @Output() activaChange = new EventEmitter<string>();

  /** Selecciona una pestaña por su id y notifica el cambio. */
  protected seleccionar(id: string): void {
    if (id !== this.activa) {
      this.activa = id;
      this.activaChange.emit(id);
    }
  }

  /** Navegación por teclado entre pestañas (flechas izquierda/derecha). */
  protected onKeydown(evento: KeyboardEvent, indice: number): void {
    if (this.tabs.length === 0) {
      return;
    }
    let destino = indice;
    if (evento.key === 'ArrowRight') {
      destino = (indice + 1) % this.tabs.length;
    } else if (evento.key === 'ArrowLeft') {
      destino = (indice - 1 + this.tabs.length) % this.tabs.length;
    } else {
      return;
    }
    evento.preventDefault();
    this.seleccionar(this.tabs[destino].id);
  }
}
