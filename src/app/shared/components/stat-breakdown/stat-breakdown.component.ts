import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Fila etiqueta/valor de un desglose. */
export interface FilaDesglose {
  /** Etiqueta de la fila (p. ej. "Renovadas"). */
  readonly label: string;
  /** Valor mostrable de la fila (p. ej. 6). */
  readonly valor: string | number;
}

/**
 * StatBreakdownComponent — Lista de desglose etiqueta/valor reutilizable.
 *
 * Renderiza una lista de filas `label` / `valor` con un divisor superior,
 * pensada para incrustarse dentro de una tarjeta (p. ej. el desglose por estado
 * del portafolio de Renovaciones). 100% tokenizado.
 *
 * Uso:
 * ```html
 * <app-stat-breakdown [filas]="[{ label: 'Renovadas', valor: 6 }]" />
 * ```
 */
@Component({
  selector: 'app-stat-breakdown',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sb">
      @for (fila of filas; track fila.label) {
        <div class="sb__row">
          <span class="sb__label">{{ fila.label }}</span>
          <strong class="sb__valor">{{ fila.valor }}</strong>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .sb {
        margin-top: var(--space-4);
        border-top: 1px solid var(--color-border);
        padding-top: var(--space-3);
      }
      .sb__row {
        display: flex;
        justify-content: space-between;
        padding: var(--space-1) var(--space-0);
        font-size: var(--text-body-sm);
        color: var(--color-text);
      }
      .sb__valor {
        color: var(--color-text);
      }
    `,
  ],
})
export class StatBreakdownComponent {
  /** Filas etiqueta/valor a renderizar. */
  @Input() filas: readonly FilaDesglose[] = [];
}
