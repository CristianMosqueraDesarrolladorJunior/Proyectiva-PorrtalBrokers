import {
  ChangeDetectionStrategy,
  Component,
  Input,
  computed,
  signal,
} from '@angular/core';

import { formatearCop } from '../../util/moneda';
/** Ítem de desglose de comisión por ramo/producto. */
export interface DesgloseRamo {
  readonly producto: string;
  readonly valor: number;
}

/** Ítem de desglose ya calculado para la vista (porcentaje + índice de color). */
interface DesgloseCalculado extends DesgloseRamo {
  readonly porcentaje: number;
  readonly indiceColor: number;
}

/** Número de colores de acento disponibles para los segmentos/dots. */
const TOTAL_COLORES = 4;

/**
 * CommissionBreakdownCardComponent — Tarjeta de comisión estimada del sistema
 * "Proyectiva Broker Nexus" (stitch).
 *
 * Reconstruye el patrón del prototipo: encabezado con etiqueta + pastilla de
 * periodo, valor monetario destacado (numeric-stat) con sufijo "COP", subtítulo,
 * una barra apilada por ramo con segmentos de color y un grid de chips (cada uno
 * con dot de color, valor y porcentaje del total).
 *
 * El cálculo de porcentajes es solo presentacional (no es lógica de negocio
 * autoritativa): el valor y el desglose provienen del backend.
 *
 * Uso:
 * ```html
 * <app-commission-breakdown-card
 *   [valorEstimado]="624000" periodo="Mayo 2026" [polizasRadicadas]="142"
 *   [desglose]="desglose" />
 * ```
 */
@Component({
  selector: 'app-commission-breakdown-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="comm">
      <header class="comm__cab">
        <span class="comm__label">Valor de comisión estimada o aproximada</span>
        @if (periodo) {
          <span class="comm__periodo-chip">{{ periodo }}</span>
        }
      </header>

      @if (tieneDatos()) {
        <div class="comm__valor-fila">
          <span class="comm__valor">{{ valorFormateado() }}</span>
          <span class="comm__moneda">COP</span>
        </div>
        <p class="comm__sub">
          {{ polizasRadicadas }} pólizas radicadas activas
          @if (promedioFormateado()) {
            · Promedio {{ promedioFormateado() }} / comisión por contrato
          }
        </p>

        <div
          class="comm__barra"
          role="img"
          [attr.aria-label]="etiquetaBarra()"
        >
          @for (item of desgloseCalculado(); track item.producto) {
            <span
              class="comm__seg"
              [class]="'comm__seg--' + item.indiceColor"
              [style.width.%]="item.porcentaje"
              [attr.title]="item.producto + ' ' + item.porcentaje + '%'"
            ></span>
          }
        </div>

        <div class="comm__grid">
          @for (item of desgloseCalculado(); track item.producto) {
            <div class="comm__chip">
              <div class="comm__chip-cab">
                <span
                  class="comm__dot"
                  [class]="'comm__dot--' + item.indiceColor"
                ></span>
                <span class="comm__chip-nombre">{{ item.producto }}</span>
              </div>
              <span class="comm__chip-valor">{{ formatearCop(item.valor) }}</span>
              <span class="comm__chip-pct">{{ item.porcentaje }}% del total</span>
            </div>
          }
        </div>
      } @else {
        <p class="comm__sub">Sin datos de comisión disponibles.</p>
      }
    </article>
  `,
  styles: [
    `
      .comm {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        padding: var(--space-6);
        background: var(--sb-surface);
        border: 1px solid var(--sb-border);
        border-radius: var(--radius-2xl);
        box-shadow: var(--sb-shadow-1);
      }
      .comm__cab {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-3);
      }
      .comm__label {
        font-family: var(--font-family-body);
        font-size: var(--text-caption);
        font-weight: var(--font-weight-bold);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--sb-secondary);
      }
      .comm__periodo-chip {
        padding: var(--space-1) var(--space-3);
        border-radius: var(--radius-full);
        background: var(--sb-surface-container);
        color: var(--sb-on-surface);
        font-family: var(--font-family-body);
        font-size: var(--text-caption);
        white-space: nowrap;
      }
      .comm__valor-fila {
        display: flex;
        align-items: baseline;
        gap: var(--space-2);
      }
      .comm__valor {
        font-family: var(--font-family-heading);
        font-size: var(--text-stat);
        font-weight: var(--font-weight-valor-comision);
        line-height: var(--line-height-tight);
        letter-spacing: -0.03em;
        color: var(--sb-on-surface);
      }
      .comm__moneda {
        font-family: var(--font-family-body);
        font-size: var(--text-body-sm);
        font-weight: var(--font-weight-semibold);
        color: var(--sb-secondary);
      }
      .comm__sub {
        margin: 0;
        font-family: var(--font-family-body);
        font-size: var(--text-body-sm);
        color: var(--sb-secondary);
      }
      .comm__barra {
        display: flex;
        width: 100%;
        height: var(--space-3);
        border-radius: var(--radius-xl);
        overflow: hidden;
        background: var(--sb-surface-low);
      }
      .comm__seg {
        height: 100%;
      }
      .comm__seg--0,
      .comm__dot--0 {
        background: var(--sb-primary);
      }
      .comm__seg--1,
      .comm__dot--1 {
        background: var(--sb-slate);
      }
      .comm__seg--2,
      .comm__dot--2 {
        background: var(--sb-tertiary);
      }
      .comm__seg--3,
      .comm__dot--3 {
        background: var(--sb-info);
      }
      .comm__grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: var(--space-2);
        margin-top: var(--space-1);
      }
      .comm__chip {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        padding: var(--space-3);
        border-radius: var(--radius-lg);
        background: var(--sb-surface-low);
      }
      .comm__chip-cab {
        display: flex;
        align-items: center;
        gap: var(--space-2);
      }
      .comm__dot {
        width: var(--space-2);
        height: var(--space-2);
        border-radius: var(--radius-full);
        flex-shrink: 0;
      }
      .comm__chip-nombre {
        font-family: var(--font-family-body);
        font-size: var(--text-caption);
        color: var(--sb-secondary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .comm__chip-valor {
        font-family: var(--font-family-heading);
        font-size: var(--text-body-sm);
        font-weight: var(--font-weight-semibold);
        color: var(--sb-on-surface);
      }
      .comm__chip-pct {
        font-family: var(--font-family-body);
        font-size: var(--text-caption);
        color: var(--sb-secondary);
      }
    `,
  ],
})
export class CommissionBreakdownCardComponent {
  /** Valor total de comisión estimada del periodo. */
  @Input({ required: true })
  set valorEstimado(valor: number) {
    this._valorEstimado.set(valor);
  }
  get valorEstimado(): number {
    return this._valorEstimado();
  }
  private readonly _valorEstimado = signal(0);

  /** Periodo de la comisión (p. ej. "Mayo 2026"). */
  @Input() periodo = '';

  /** Número de pólizas radicadas activas del periodo. */
  @Input() polizasRadicadas = 0;

  /** Desglose de comisión por ramo/producto. */
  @Input()
  set desglose(items: readonly DesgloseRamo[]) {
    this._desglose.set(items ?? []);
  }
  get desglose(): readonly DesgloseRamo[] {
    return this._desglose();
  }
  private readonly _desglose = signal<readonly DesgloseRamo[]>([]);

  /** Indica si hay datos de comisión disponibles para pintar. */
  protected readonly tieneDatos = computed(
    () => this._desglose().length > 0 || this._valorEstimado() > 0,
  );

  /** Total del desglose (denominador para los porcentajes). */
  private readonly totalDesglose = computed(() =>
    this._desglose().reduce((acc, item) => acc + item.valor, 0),
  );

  /** Desglose con porcentaje e índice de color calculados para la vista. */
  protected readonly desgloseCalculado = computed<readonly DesgloseCalculado[]>(
    () => {
      const total = this.totalDesglose();
      return this._desglose().map((item, indice) => ({
        ...item,
        porcentaje:
          total > 0 ? Math.round((item.valor / total) * 1000) / 10 : 0,
        indiceColor: indice % TOTAL_COLORES,
      }));
    },
  );

  /** Valor total formateado como pesos colombianos. */
  protected readonly valorFormateado = computed(() =>
    this.formatearCop(this._valorEstimado()),
  );

  /** Promedio de comisión por contrato, formateado (o null si no aplica). */
  protected readonly promedioFormateado = computed(() => {
    if (this.polizasRadicadas <= 0) {
      return null;
    }
    return this.formatearCop(
      Math.round(this._valorEstimado() / this.polizasRadicadas),
    );
  });

  /** Etiqueta accesible de la barra apilada. */
  protected readonly etiquetaBarra = computed(() =>
    this.desgloseCalculado()
      .map((item) => `${item.producto} ${item.porcentaje}%`)
      .join(', '),
  );

  /** Formatea un valor como pesos colombianos sin decimales. */
  protected formatearCop(valor: number): string {
    return formatearCop(valor);
  }
}
