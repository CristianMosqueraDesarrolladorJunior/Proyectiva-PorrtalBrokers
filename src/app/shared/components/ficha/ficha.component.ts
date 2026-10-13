import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/**
 * Dato de una ficha. `ancho` ocupa toda la fila (direcciones, observaciones); `destacado` resalta
 * cifras clave (prima, canon, comisión).
 */
export interface DatoFicha {
  readonly etiqueta: string;
  readonly valor: string | number | null | undefined;
  readonly ancho?: boolean;
  readonly destacado?: boolean;
}

/** Sección colapsable de la ficha. `colapsada` la muestra cerrada al abrir el modal. */
export interface SeccionFicha {
  readonly titulo?: string;
  readonly icono?: string;
  readonly descripcion?: string;
  readonly colapsada?: boolean;
  readonly datos: readonly DatoFicha[];
}

/**
 * Ficha de datos de un registro (negocio, broker, póliza…) en secciones colapsables tipo tarjeta.
 * Un valor vacío se muestra como «—» atenuado; nunca se oculta el campo. Usa `<details>` nativo:
 * teclado y lector de pantalla funcionan sin código extra.
 */
@Component({
  selector: 'app-ficha',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, NgTemplateOutlet],
  template: `
    @for (seccion of secciones; track $index) {
      @if (seccion.titulo) {
        <details class="fi" [open]="!seccion.colapsada">
          <summary class="fi__cab">
            <span class="fi__icono" aria-hidden="true"><app-icon [nombre]="seccion.icono ?? 'info'" [tamano]="18" /></span>
            <span class="fi__textos">
              <span class="fi__titulo">{{ seccion.titulo }}</span>
              @if (seccion.descripcion) {
                <span class="fi__desc">{{ seccion.descripcion }}</span>
              }
            </span>
            <span class="fi__conteo">{{ completos(seccion) }}/{{ seccion.datos.length }}</span>
            <span class="fi__chevron" aria-hidden="true"><app-icon nombre="expand_more" [tamano]="20" /></span>
          </summary>
          <ng-container *ngTemplateOutlet="rejilla; context: { $implicit: seccion }" />
        </details>
      } @else {
        <div class="fi fi--plana">
          <ng-container *ngTemplateOutlet="rejilla; context: { $implicit: seccion }" />
        </div>
      }
    }

    <ng-template #rejilla let-seccion>
      <dl class="fi__rejilla">
        @for (dato of seccion.datos; track dato.etiqueta) {
          <div class="fi__dato" [class.fi__dato--ancho]="dato.ancho" [class.fi__dato--destacado]="dato.destacado">
            <dt>{{ dato.etiqueta }}</dt>
            @if (vacio(dato)) {
              <dd class="fi__vacio">Sin dato</dd>
            } @else {
              <dd>{{ dato.valor }}</dd>
            }
          </div>
        }
      </dl>
    </ng-template>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
      }
      .fi {
        border: 1px solid var(--sb-border);
        border-radius: var(--radius-xl);
        background: var(--sb-surface);
        box-shadow: var(--sb-shadow-1);
        overflow: hidden;
      }
      .fi--plana {
        box-shadow: none;
      }
      .fi__cab {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-3) var(--space-4);
        background: linear-gradient(180deg, var(--sb-surface-low), var(--sb-surface));
        cursor: pointer;
        list-style: none;
        user-select: none;
      }
      .fi__cab::-webkit-details-marker {
        display: none;
      }
      .fi__cab:focus-visible {
        outline: var(--focus-ring-width) solid var(--sb-primary);
        outline-offset: -2px;
      }
      .fi[open] > .fi__cab {
        border-bottom: 1px solid var(--sb-border);
      }
      .fi__icono {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        flex: none;
        border-radius: var(--radius-lg);
        background: var(--sb-tint-accent-bg);
        color: var(--sb-primary);
      }
      .fi__textos {
        display: flex;
        flex-direction: column;
        min-width: 0;
        flex: 1;
      }
      .fi__titulo {
        font-family: var(--font-family-heading);
        font-size: var(--text-body);
        font-weight: var(--font-weight-bold);
        color: var(--sb-on-surface);
      }
      .fi__desc {
        font-size: var(--text-caption);
        color: var(--sb-secondary);
      }
      .fi__conteo {
        flex: none;
        padding: 2px var(--space-2);
        border-radius: var(--radius-full);
        background: var(--sb-surface-low);
        border: 1px solid var(--sb-border);
        font-size: var(--text-caption);
        font-weight: var(--font-weight-semibold);
        color: var(--sb-secondary);
        font-variant-numeric: tabular-nums;
      }
      .fi__chevron {
        display: inline-flex;
        color: var(--sb-secondary);
        transition: transform 0.18s ease;
      }
      .fi:not([open]) .fi__chevron {
        transform: rotate(-90deg);
      }
      .fi__rejilla {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
        margin: 0;
        padding: var(--space-2) var(--space-4) var(--space-4);
        column-gap: var(--space-5);
      }
      .fi__dato {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: var(--space-3) 0;
        border-bottom: 1px dashed var(--sb-border);
        min-width: 0;
      }
      .fi__dato--ancho {
        grid-column: 1 / -1;
      }
      dt {
        font-size: 0.6875rem;
        font-weight: var(--font-weight-semibold);
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--sb-secondary);
      }
      dd {
        margin: 0;
        font-size: var(--text-body-sm);
        font-weight: var(--font-weight-semibold);
        color: var(--sb-on-surface);
        overflow-wrap: anywhere;
      }
      .fi__dato--destacado dd {
        font-family: var(--font-family-heading);
        font-size: var(--text-title, 1.125rem);
        font-weight: var(--font-weight-bold);
        color: var(--sb-primary);
        font-variant-numeric: tabular-nums;
      }
      dd.fi__vacio {
        font-weight: var(--font-weight-regular, 400);
        font-style: italic;
        color: var(--sb-secondary);
        opacity: 0.75;
      }
      @media (prefers-reduced-motion: reduce) {
        .fi__chevron {
          transition: none;
        }
      }
    `,
  ],
})
export class FichaComponent {
  @Input({ required: true }) secciones: readonly SeccionFicha[] = [];

  vacio(dato: DatoFicha): boolean {
    return dato.valor === null || dato.valor === undefined || dato.valor === '' || dato.valor === '—';
  }

  completos(seccion: SeccionFicha): number {
    return seccion.datos.filter((d) => !this.vacio(d)).length;
  }
}
