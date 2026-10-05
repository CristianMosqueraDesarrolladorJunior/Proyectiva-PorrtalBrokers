import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/** Ítem de la ruta de migas (breadcrumb) del sistema stitch. */
export interface ItemBreadcrumb {
  /** Etiqueta visible de la miga. */
  label: string;
  /** Indica si es la miga activa (última / actual). */
  activo?: boolean;
}

/**
 * BreadcrumbComponent — Ruta de migas del sistema "Proyectiva Broker Nexus" (stitch).
 *
 * Renderiza una lista de migas separadas por el ícono `chevron_right`. La miga
 * marcada como `activo` se resalta y se anuncia con `aria-current="page"`.
 *
 * Uso:
 * ```html
 * <app-breadcrumb [items]="[{label:'Inicio'},{label:'Detalle', activo:true}]" />
 * ```
 */
@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <nav class="bc" aria-label="Ruta de navegación">
      <ol class="bc__lista">
        @for (item of items; track item.label; let ultimo = $last) {
          <li class="bc__item">
            <span
              class="bc__label"
              [class.bc__label--activo]="item.activo"
              [attr.aria-current]="item.activo ? 'page' : null"
              >{{ item.label }}</span
            >
            @if (!ultimo) {
              <app-icon class="bc__sep" nombre="chevron_right" [tamano]="16" />
            }
          </li>
        }
      </ol>
    </nav>
  `,
  styles: [
    `
      .bc__lista {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--space-1);
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .bc__item {
        display: inline-flex;
        align-items: center;
        gap: var(--space-1);
      }
      .bc__label {
        font-family: var(--font-family-body);
        font-size: var(--text-caption);
        color: var(--sb-secondary);
      }
      .bc__label--activo {
        color: var(--sb-on-surface);
        font-weight: var(--font-weight-semibold);
      }
      .bc__sep {
        color: var(--sb-secondary);
      }
    `,
  ],
})
export class BreadcrumbComponent {
  /** Migas a mostrar, en orden. */
  @Input() items: ItemBreadcrumb[] = [];
}
