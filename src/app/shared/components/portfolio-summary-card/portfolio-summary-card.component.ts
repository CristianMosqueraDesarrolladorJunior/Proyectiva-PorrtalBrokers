import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Fila de desglose (etiqueta + valor) del resumen de portafolio. */
export interface FilaPortafolio {
  /** Etiqueta descriptiva de la fila (p. ej. "Renovadas"). */
  readonly label: string;
  /** Valor mostrable de la fila (número o texto). */
  readonly valor: string | number;
}

/**
 * PortfolioSummaryCardComponent — Tarjeta de resumen de portafolio del sistema
 * "Proyectiva Broker Nexus" (stitch).
 *
 * Muestra una etiqueta superior, un valor total destacado (`numeric-stat`), un
 * subtexto y una lista de filas `label`/`valor` separadas por un divisor. Pensada
 * para reutilizarse donde haya un "total + desglose" (p. ej. Pólizas en portafolio).
 *
 * Uso:
 * ```html
 * <app-portfolio-summary-card
 *   etiqueta="Pólizas en portafolio" [valor]="18" sub="Total de pólizas activas"
 *   [desglose]="[{ label: 'Renovadas', valor: 6 }]" />
 * ```
 */
@Component({
  selector: 'app-portfolio-summary-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="pfs">
      <span class="pfs__label">{{ etiqueta }}</span>
      <span class="pfs__valor">{{ valor }}</span>
      @if (sub) {
        <span class="pfs__sub">{{ sub }}</span>
      }
      @if (desglose.length > 0) {
        <dl class="pfs__desglose">
          @for (fila of desglose; track fila.label) {
            <div class="pfs__row">
              <dt>{{ fila.label }}</dt>
              <dd>{{ fila.valor }}</dd>
            </div>
          }
        </dl>
      }
    </article>
  `,
  styles: [
    `
      .pfs {
        display: flex;
        flex-direction: column;
        padding: var(--space-6);
        background: var(--sb-surface);
        border: 1px solid var(--sb-border);
        border-radius: var(--radius-2xl);
        box-shadow: var(--sb-shadow-1);
      }
      .pfs__label {
        font-family: var(--font-family-body);
        font-size: var(--text-caption);
        font-weight: var(--font-weight-bold);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--sb-secondary);
      }
      .pfs__valor {
        font-family: var(--font-family-heading);
        font-size: var(--text-stat);
        font-weight: var(--font-weight-bold);
        line-height: var(--line-height-tight);
        color: var(--sb-on-surface);
        margin: var(--space-1) 0;
      }
      .pfs__sub {
        font-family: var(--font-family-body);
        font-size: var(--text-body-sm);
        color: var(--sb-secondary);
      }
      .pfs__desglose {
        margin: var(--space-4) 0 0;
        padding-top: var(--space-3);
        border-top: 1px solid var(--sb-border);
        display: flex;
        flex-direction: column;
      }
      .pfs__row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        padding: var(--space-2) 0;
        font-family: var(--font-family-body);
        font-size: var(--text-body-sm);
        color: var(--sb-on-surface);
      }
      .pfs__row dt {
        color: var(--sb-secondary);
      }
      .pfs__row dd {
        margin: 0;
        font-weight: var(--font-weight-semibold);
      }
    `,
  ],
})
export class PortfolioSummaryCardComponent {
  /** Etiqueta superior de la tarjeta. */
  @Input({ required: true }) etiqueta = '';

  /** Valor total destacado. */
  @Input({ required: true }) valor: string | number = '';

  /** Subtexto complementario opcional. */
  @Input() sub?: string;

  /** Filas de desglose (etiqueta + valor). */
  @Input() desglose: readonly FilaPortafolio[] = [];
}
