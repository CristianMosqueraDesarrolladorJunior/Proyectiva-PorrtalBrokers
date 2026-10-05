import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Tono de la tarjeta de estadística. `default` deja superficie blanca; el resto
 * aplica fondo/borde/texto semántico teñido (verde/naranja/rojo).
 */
export type TonoStatCard = 'default' | 'success' | 'accent' | 'danger';

/**
 * StatCardComponent — Tarjeta de estadística simple y reutilizable.
 *
 * Reproduce el patrón de tarjeta del portafolio y los estados de Renovaciones:
 * una etiqueta en mayúsculas, un valor destacado, un subtítulo y, opcionalmente,
 * contenido proyectado bajo el valor (p. ej. un desglose) mediante el slot
 * `[extra]`. El `tono` aplica el fondo/borde/texto semántico teñido.
 *
 * 100% tokenizado (sin valores hardcodeados de color/tipografía/espaciado).
 *
 * Uso:
 * ```html
 * <app-stat-card label="Renovadas" valor="6" sub="Al día con renovaciones" tono="success" />
 * <app-stat-card label="Pólizas en portafolio" valor="18" sub="Total de pólizas activas">
 *   <div extra><!-- desglose --></div>
 * </app-stat-card>
 * ```
 */
@Component({
  selector: 'app-stat-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="stat"
      [class.stat--success]="tono === 'success'"
      [class.stat--accent]="tono === 'accent'"
      [class.stat--danger]="tono === 'danger'"
    >
      <span class="stat__label">{{ label }}</span>
      <span class="stat__valor">{{ valor }}</span>
      <div class="stat__extra"><ng-content select="[extra]"></ng-content></div>
      @if (sub) {
        <span class="stat__sub">{{ sub }}</span>
      }
    </article>
  `,
  styles: [
    `
      .stat {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        padding: var(--space-5);
        background: var(--color-card);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-sm);
        height: 100%;
        box-sizing: border-box;
      }
      .stat__label {
        font-size: var(--text-caption);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: var(--font-weight-semibold);
        color: var(--color-muted);
      }
      .stat__valor {
        font-size: var(--text-stat);
        font-weight: var(--font-weight-bold);
        color: var(--color-text);
        margin: var(--space-1) var(--space-0);
      }
      .stat__sub {
        font-size: var(--text-body-sm);
        color: var(--color-muted);
      }
      .stat__extra:empty {
        display: none;
      }
      .stat--success {
        background: var(--sb-tint-success-bg);
        border-color: var(--sb-tint-success-border);
      }
      .stat--success .stat__label,
      .stat--success .stat__valor {
        color: var(--color-success);
      }
      .stat--accent {
        background: var(--sb-tint-accent-bg);
        border-color: var(--sb-tint-accent-border);
      }
      .stat--accent .stat__label,
      .stat--accent .stat__valor {
        color: var(--color-accent);
      }
      .stat--danger {
        background: var(--sb-tint-danger-bg);
        border-color: var(--sb-tint-danger-border);
      }
      .stat--danger .stat__label,
      .stat--danger .stat__valor {
        color: var(--color-danger);
      }
    `,
  ],
})
export class StatCardComponent {
  /** Etiqueta en mayúsculas de la tarjeta. */
  @Input({ required: true }) label = '';

  /** Valor destacado (número o texto). */
  @Input({ required: true }) valor: string | number = '';

  /** Subtítulo complementario mostrado al pie. */
  @Input() sub?: string;

  /** Tono semántico teñido de la tarjeta. */
  @Input() tono: TonoStatCard = 'default';
}
