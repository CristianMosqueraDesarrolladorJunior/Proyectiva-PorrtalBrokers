import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/** Variantes visuales de la tarjeta de KPI del sistema stitch. */
export type VarianteKpiCard = 'default' | 'alerta' | 'exito';

/**
 * Tono de fondo semántico (tinted) de la tarjeta de KPI. `none` deja la
 * superficie blanca por defecto; el resto aplica fondo/borde/texto teñidos.
 */
export type TonoKpiCard = 'none' | 'success' | 'accent' | 'danger';

/**
 * KpiCardComponent — Tarjeta de indicador (KPI) del sistema "Proyectiva Broker Nexus" (stitch).
 *
 * Muestra una etiqueta, un valor numérico destacado (numeric-stat con
 * `--font-size-8xl`/`--font-weight-bold`), un ícono en chip opcional, un
 * `delta` (con color según `deltaPositivo`) y un subtexto. La variante `alerta`
 * agrega un inset de color a la izquierda.
 *
 * Uso:
 * ```html
 * <app-kpi-card label="Solicitudes" [valor]="128" icono="description"
 *   delta="+12%" [deltaPositivo]="true" sub="vs. mes anterior" />
 * ```
 */
@Component({
  selector: 'app-kpi-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <article
      class="kpi"
      [class.kpi--alerta]="variante === 'alerta'"
      [class.kpi--exito]="variante === 'exito'"
      [class.kpi--tono-success]="tono === 'success'"
      [class.kpi--tono-accent]="tono === 'accent'"
      [class.kpi--tono-danger]="tono === 'danger'"
    >
      <div class="kpi__cab">
        <p class="kpi__label">{{ label }}</p>
        @if (icono) {
          <span class="kpi__chip"><app-icon [nombre]="icono" [tamano]="20" /></span>
        }
      </div>
      <p class="kpi__valor">{{ valor }}</p>
      <div class="kpi__desglose"><ng-content select="[desglose]"></ng-content></div>
      @if (delta || sub) {
        <div class="kpi__pie">
          @if (delta) {
            <span class="kpi__delta" [class.kpi__delta--pos]="deltaPositivo" [class.kpi__delta--neg]="!deltaPositivo">
              <app-icon [nombre]="deltaPositivo ? 'trending_up' : 'trending_down'" [tamano]="16" />
              {{ delta }}
            </span>
          }
          @if (sub) {
            <span class="kpi__sub">{{ sub }}</span>
          }
        </div>
      }
    </article>
  `,
  styles: [
    `
      .kpi {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        padding: var(--space-5);
        background: var(--sb-surface);
        border: 1px solid var(--sb-border);
        border-radius: var(--radius-2xl);
        box-shadow: var(--sb-shadow-1);
        overflow: hidden;
      }
      .kpi--alerta::before,
      .kpi--exito::before {
        content: '';
        position: absolute;
        inset: 0 auto 0 0;
        width: var(--space-1);
      }
      .kpi--alerta::before {
        background: var(--sb-error);
      }
      .kpi--exito::before {
        background: var(--sb-tertiary);
      }
      .kpi--tono-success {
        background: var(--sb-tint-success-bg);
        border-color: var(--sb-tint-success-border);
      }
      .kpi--tono-success .kpi__label,
      .kpi--tono-success .kpi__valor {
        color: var(--sb-tint-success-text);
      }
      .kpi--tono-accent {
        background: var(--sb-tint-accent-bg);
        border-color: var(--sb-tint-accent-border);
      }
      .kpi--tono-accent .kpi__label,
      .kpi--tono-accent .kpi__valor {
        color: var(--sb-tint-accent-text);
      }
      .kpi--tono-danger {
        background: var(--sb-tint-danger-bg);
        border-color: var(--sb-tint-danger-border);
      }
      .kpi--tono-danger .kpi__label,
      .kpi--tono-danger .kpi__valor {
        color: var(--sb-tint-danger-text);
      }
      .kpi__cab {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-3);
      }
      .kpi__label {
        margin: 0;
        font-family: var(--font-family-body);
        font-size: var(--text-body-sm);
        font-weight: var(--font-weight-medium);
        color: var(--sb-secondary);
      }
      .kpi__chip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--space-8);
        height: var(--space-8);
        border-radius: var(--radius-lg);
        background: var(--sb-surface-low);
        color: var(--sb-primary);
      }
      .kpi__valor {
        margin: 0;
        font-family: var(--font-family-heading);
        font-size: var(--text-headline);
        font-weight: var(--font-weight-bold);
        line-height: var(--line-height-tight);
        color: var(--sb-on-surface);
      }
      .kpi__desglose:empty {
        display: none;
      }
      .kpi__pie {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--space-2);
      }
      .kpi__delta {
        display: inline-flex;
        align-items: center;
        gap: var(--space-1);
        font-family: var(--font-family-body);
        font-size: var(--text-caption);
        font-weight: var(--font-weight-semibold);
      }
      .kpi__delta--pos {
        color: var(--sb-tertiary);
      }
      .kpi__delta--neg {
        color: var(--sb-error);
      }
      .kpi__sub {
        font-family: var(--font-family-body);
        font-size: var(--text-caption);
        color: var(--sb-secondary);
      }
    `,
  ],
})
export class KpiCardComponent {
  /** Etiqueta del indicador. */
  @Input({ required: true }) label = '';

  /** Valor destacado del indicador (texto o número). */
  @Input({ required: true }) valor: string | number = '';

  /** Nombre del ícono Material Symbols mostrado en el chip (opcional). */
  @Input() icono?: string;

  /** Texto del delta / variación (p. ej. "+12%"). */
  @Input() delta?: string;

  /** Indica si el delta es positivo (color éxito) o negativo (color error). */
  @Input() deltaPositivo = true;

  /** Variante visual de la tarjeta. */
  @Input() variante: VarianteKpiCard = 'default';

  /** Tono de fondo semántico (tinted) de la tarjeta. */
  @Input() tono: TonoKpiCard = 'none';

  /** Subtexto complementario (p. ej. "vs. mes anterior"). */
  @Input() sub?: string;
}
