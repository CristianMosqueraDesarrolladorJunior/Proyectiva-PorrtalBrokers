import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Colores semánticos admitidos por una pill de estado. */
export type ColorStatusPill = 'exito' | 'primary' | 'error' | 'neutral';

/** Ítem de una pill de estado del sistema stitch. */
export interface ItemStatusPill {
  /** Etiqueta visible de la pill. */
  label: string;
  /** Color semántico de la pill y su punto. */
  color: ColorStatusPill;
}

/**
 * StatusPillGroupComponent — Grupo de pills de estado del sistema "Proyectiva Broker Nexus" (stitch).
 *
 * Renderiza una lista de pills `rounded-full` con un punto (dot) de color según
 * la variante semántica. Totalmente tokenizado.
 *
 * Uso:
 * ```html
 * <app-status-pill-group [items]="[{label:'Activa', color:'exito'}]" />
 * ```
 */
@Component({
  selector: 'app-status-pill-group',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="spg">
      @for (item of items; track item.label) {
        <li class="spg__pill" [attr.data-color]="item.color">
          <span class="spg__dot"></span>
          {{ item.label }}
        </li>
      }
    </ul>
  `,
  styles: [
    `
      .spg {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .spg__pill {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-1) var(--space-3);
        border-radius: var(--radius-pill);
        font-family: var(--font-family-body);
        font-size: var(--text-caption);
        font-weight: var(--font-weight-medium);
        background: var(--sb-surface-low);
        color: var(--sb-on-surface);
      }
      .spg__dot {
        width: var(--space-2);
        height: var(--space-2);
        border-radius: var(--radius-full);
        background: var(--sb-secondary);
      }
      .spg__pill[data-color='exito'] .spg__dot {
        background: var(--sb-tertiary);
      }
      .spg__pill[data-color='primary'] .spg__dot {
        background: var(--sb-primary);
      }
      .spg__pill[data-color='error'] .spg__dot {
        background: var(--sb-error);
      }
      .spg__pill[data-color='neutral'] .spg__dot {
        background: var(--sb-secondary);
      }
    `,
  ],
})
export class StatusPillGroupComponent {
  /** Pills a renderizar. */
  @Input() items: readonly ItemStatusPill[] = [];
}
