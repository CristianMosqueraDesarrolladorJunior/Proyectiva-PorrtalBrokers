import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Par etiqueta/valor mostrado como fila del resumen. */
export interface FilaResumen {
  /** Etiqueta descriptiva de la fila (p. ej. "Prima anual"). */
  readonly label: string;
  /** Valor mostrable de la fila (p. ej. "$ 1.200.000"). */
  readonly valor: string;
}

/** Par etiqueta/valor del total destacado del resumen. */
export interface ValorResumen {
  /** Etiqueta del total (p. ej. "Comisión estimada"). */
  readonly label: string;
  /** Valor destacado del total. */
  readonly valor: string;
}

/**
 * SummaryCardComponent — Tarjeta oscura de "cálculo en vivo" del sistema
 * "Proyectiva Broker Nexus" (stitch).
 *
 * Presenta un título, una lista de filas `label`/`valor`, un total destacado y
 * un badge opcional. Proyecta acciones mediante `<ng-content select="[acciones]">`.
 * Superficie slate (`--sb-slate`) con texto claro; 100% tokenizado.
 *
 * Uso:
 * ```html
 * <app-summary-card
 *   titulo="Resumen de cotización"
 *   [filas]="[{ label: 'Prima anual', valor: '$ 1.200.000' }]"
 *   [total]="{ label: 'Comisión estimada', valor: '$ 240.000' }"
 *   badge="En vivo">
 *   <button acciones>Compartir</button>
 * </app-summary-card>
 * ```
 */
@Component({
  selector: 'app-summary-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="sc">
      <header class="sc__cab">
        <h3 class="sc__titulo">{{ titulo }}</h3>
        @if (badge) {
          <span class="sc__badge">{{ badge }}</span>
        }
      </header>

      @if (principal) {
        <div class="sc__principal">
          <span class="sc__principal-label">{{ principal.label }}</span>
          <span class="sc__principal-valor">
            {{ principal.valor }}
            @if (principal.unidad) {
              <small>{{ principal.unidad }}</small>
            }
          </span>
        </div>
      }

      @if (destacado) {
        <div class="sc__destacado">
          <span class="sc__destacado-label">{{ destacado.label }}</span>
          <span class="sc__destacado-valor">{{ destacado.valor }}</span>
          @if (destacado.nota) {
            <span class="sc__destacado-nota">{{ destacado.nota }}</span>
          }
        </div>
      }

      @if (filas.length > 0) {
        <dl class="sc__filas">
          @for (fila of filas; track fila.label) {
            <div class="sc__fila">
              <dt class="sc__fila-label">{{ fila.label }}</dt>
              <dd class="sc__fila-valor">{{ fila.valor }}</dd>
            </div>
          }
        </dl>
      }

      @if (total) {
        <div class="sc__total">
          <span class="sc__total-label">{{ total.label }}</span>
          <span class="sc__total-valor">{{ total.valor }}</span>
        </div>
      }

      <div class="sc__acciones">
        <ng-content select="[acciones]"></ng-content>
      </div>
      <div class="sc__pie"><ng-content select="[pie]"></ng-content></div>
    </section>
  `,
  styles: [
    `
      .sc {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        padding: var(--card-padding);
        background: var(--sb-slate);
        color: var(--sb-on-slate);
        border-radius: var(--radius-xl);
        box-shadow: var(--sb-shadow-2);
      }
      .sc__cab {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-3);
      }
      .sc__titulo {
        margin: 0;
        font-family: var(--font-family-heading);
        font-size: var(--text-body);
        font-weight: var(--font-weight-semibold);
        color: var(--sb-on-slate);
      }
      .sc__badge {
        flex-shrink: 0;
        white-space: nowrap;
        display: inline-flex;
        align-items: center;
        padding: var(--space-1) var(--space-3);
        border-radius: var(--radius-pill);
        background: var(--sb-primary);
        color: var(--sb-on-primary);
        font-family: var(--font-family-body);
        font-size: var(--text-caption);
        font-weight: var(--font-weight-bold);
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .sc__filas {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        margin: 0;
      }
      .sc__fila {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: var(--space-3);
        padding-bottom: var(--space-2);
        border-bottom: 1px solid color-mix(in srgb, var(--color-card) 10%, transparent);
      }
      .sc__fila-label {
        font-family: var(--font-family-body);
        font-size: var(--text-body-sm);
        color: var(--sb-primary-fixed);
      }
      .sc__fila-valor {
        margin: 0;
        font-family: var(--font-family-body);
        font-size: var(--text-body-sm);
        font-weight: var(--font-weight-semibold);
        color: var(--sb-on-slate);
      }
      .sc__total {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: var(--space-3);
      }
      .sc__total-label {
        font-family: var(--font-family-body);
        font-size: var(--text-body-sm);
        font-weight: var(--font-weight-semibold);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--sb-primary-fixed);
      }
      .sc__total-valor {
        font-family: var(--font-family-heading);
        font-size: var(--text-stat);
        font-weight: var(--font-weight-bold);
        line-height: var(--line-height-tight);
        color: var(--sb-on-slate);
      }
      .sc__principal {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
      }
      .sc__principal-label {
        font-size: var(--text-body-sm);
        color: var(--sb-on-slate);
      }
      .sc__principal-valor {
        font-family: var(--font-family-heading);
        font-size: var(--text-stat);
        font-weight: var(--font-weight-bold);
        line-height: var(--line-height-tight);
        letter-spacing: -0.02em;
        color: var(--sb-on-slate);
      }
      .sc__principal-valor small {
        margin-left: var(--space-2);
        font-size: var(--text-body);
        font-weight: var(--font-weight-semibold);
        letter-spacing: 0;
        color: var(--sb-primary-fixed);
      }
      .sc__destacado {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        padding: var(--space-3) var(--space-4);
        border-radius: var(--radius-lg);
        background: color-mix(in srgb, var(--color-card) 6%, transparent);
      }
      .sc__destacado-label {
        font-size: var(--text-body-sm);
        font-weight: var(--font-weight-semibold);
        color: var(--sb-tertiary-fixed);
      }
      .sc__destacado-valor {
        font-family: var(--font-family-heading);
        font-size: var(--text-headline);
        font-weight: var(--font-weight-bold);
        color: var(--sb-tertiary-fixed);
      }
      .sc__destacado-nota {
        font-size: var(--text-caption);
        color: var(--sb-on-slate);
      }
      .sc__pie:empty,
      .sc__acciones:empty {
        display: none;
      }
      .sc__acciones {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }
      /* Botones proyectados: ancho completo y variantes legibles sobre fondo oscuro. */
      .sc__acciones ::ng-deep app-boton {
        display: block;
        width: 100%;
      }
      .sc__acciones ::ng-deep .boton {
        width: 100%;
      }
      .sc__acciones ::ng-deep .btn-outline,
      .sc__acciones ::ng-deep .btn-ghost {
        background: transparent;
        color: var(--sb-on-slate);
        border-color: color-mix(in srgb, var(--color-card) 35%, transparent);
      }
      .sc__acciones ::ng-deep .btn-outline:hover:not(:disabled),
      .sc__acciones ::ng-deep .btn-ghost:hover:not(:disabled) {
        background: color-mix(in srgb, var(--color-card) 10%, transparent);
        color: var(--sb-on-slate);
      }
    `,
  ],
})
export class SummaryCardComponent {
  /** Título de la tarjeta. */
  @Input({ required: true }) titulo = '';

  /** Filas etiqueta/valor del resumen. */
  @Input() filas: readonly FilaResumen[] = [];

  /** Total destacado opcional. */
  @Input() total: ValorResumen | null = null;

  /** Texto del badge opcional (p. ej. "En vivo"). */
  @Input() badge: string | null = null;

  /** Valor principal grande (p. ej. prima mensual) con unidad opcional. */
  @Input() principal: { label: string; valor: string; unidad?: string } | null = null;

  /** Bloque destacado en verde (p. ej. comisión) con nota opcional. */
  @Input() destacado: { label: string; valor: string; nota?: string } | null = null;
}
