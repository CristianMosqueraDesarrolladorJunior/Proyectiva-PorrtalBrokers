import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { IconComponent } from '../icon/icon.component';

export interface ItemInfoLista {
  readonly titulo: string;
  readonly descripcion?: string;
  /** Valor destacado a la derecha (p. ej. "25% comisión"). */
  readonly valor?: string;
}

export type TonoInfoLista = 'neutral' | 'accent' | 'dark';

/**
 * Tarjeta lateral informativa con lista: beneficios/tarifas (`variante="valores"`)
 * o pasos con línea de tiempo (`variante="pasos"`). `tono="accent"` usa el tinte
 * naranja de marca; `tono="dark"` el navy de marca con numerales de color
 * (naranja → claro → verde).
 */
@Component({
  selector: 'app-info-list-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <section class="ilc" [attr.data-tono]="tono">
      <header class="ilc__cab">
        @if (icono) {
          <span class="ilc__icono" aria-hidden="true"><app-icon [nombre]="icono" [tamano]="20" /></span>
        }
        <div class="ilc__cab-texto">
          @if (etiqueta) {
            <span class="ilc__etiqueta">{{ etiqueta }}</span>
          }
          <h3 class="ilc__titulo">{{ titulo }}</h3>
        </div>
      </header>
      @if (descripcion) {
        <p class="ilc__descripcion">{{ descripcion }}</p>
      }
      @if (variante === 'pasos') {
        <ol class="ilc__lista ilc__lista--pasos">
          @for (item of items; track item.titulo; let i = $index) {
            <li class="ilc__paso">
              <span class="ilc__num" [attr.data-paso]="i" aria-hidden="true">{{ i + 1 }}</span>
              <div class="ilc__paso-texto">
                <strong>{{ item.titulo }}</strong>
                @if (item.descripcion) {
                  <p>{{ item.descripcion }}</p>
                }
              </div>
            </li>
          }
        </ol>
      } @else {
        <ul class="ilc__lista">
          @for (item of items; track item.titulo) {
            <li class="ilc__valor-fila">
              <div>
                <strong>{{ item.titulo }}</strong>
                @if (item.descripcion) {
                  <p>{{ item.descripcion }}</p>
                }
              </div>
              @if (item.valor) {
                <span class="ilc__valor">{{ item.valor }}</span>
              }
            </li>
          }
        </ul>
      }
      <ng-content></ng-content>
    </section>
  `,
  styles: [
    `
      .ilc {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
        padding: var(--card-padding);
        background: var(--sb-surface);
        border: 1px solid var(--sb-border);
        border-radius: var(--radius-xl);
        box-shadow: var(--sb-shadow-1);
      }
      .ilc[data-tono='accent'] {
        background: var(--sb-tint-accent-bg);
        border-color: var(--sb-tint-accent-border);
      }
      .ilc[data-tono='dark'] {
        background: var(--sb-slate);
        border-color: var(--sb-slate);
        box-shadow: var(--sb-shadow-2);
      }
      .ilc[data-tono='dark'] .ilc__titulo,
      .ilc[data-tono='dark'] strong {
        color: var(--sb-on-slate);
      }
      .ilc[data-tono='dark'] .ilc__etiqueta {
        color: var(--sb-primary-fixed);
      }
      .ilc[data-tono='dark'] p {
        color: var(--color-sidebar-text);
      }
      .ilc[data-tono='dark'] .ilc__paso:not(:last-child)::before {
        background: var(--color-sidebar-border);
      }
      .ilc[data-tono='dark'] .ilc__num[data-paso='1'] {
        background: var(--sb-on-slate);
        color: var(--sb-slate);
      }
      .ilc__cab {
        display: flex;
        align-items: center;
        gap: var(--space-3);
      }
      .ilc__icono {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: var(--icon-badge-size);
        height: var(--icon-badge-size);
        border-radius: var(--radius-md);
        background: var(--sb-primary);
        color: var(--sb-on-primary);
      }
      .ilc__cab-texto {
        display: flex;
        flex-direction: column;
      }
      .ilc__etiqueta {
        font-size: var(--text-caption);
        font-weight: var(--font-weight-bold);
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--sb-primary-hover);
      }
      .ilc__titulo {
        margin: 0;
        font-size: var(--text-subtitle);
        font-weight: var(--font-weight-semibold);
        color: var(--sb-on-surface);
      }
      .ilc__lista {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
      }
      strong {
        font-size: var(--text-body);
        color: var(--sb-on-surface);
      }
      p {
        margin: 0;
        font-size: var(--text-body-sm);
        color: var(--sb-secondary);
        line-height: var(--line-height-normal);
      }
      .ilc__valor-fila {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-3);
        padding: var(--space-3) var(--space-4);
        background: var(--sb-surface-low);
        border-radius: var(--radius-lg);
      }
      .ilc__valor {
        font-family: var(--font-family-heading);
        font-weight: var(--font-weight-bold);
        color: var(--sb-primary-hover);
        text-align: right;
      }

      /* Pasos: línea de tiempo vertical con numerales de color */
      .ilc__lista--pasos {
        gap: 0;
      }
      .ilc__paso {
        position: relative;
        display: flex;
        gap: var(--space-3);
        padding-bottom: var(--space-4);
      }
      .ilc__paso:last-child {
        padding-bottom: 0;
      }
      .ilc__paso:not(:last-child)::before {
        content: '';
        position: absolute;
        left: calc(var(--section-number-size) / 2 - 1px);
        top: var(--section-number-size);
        bottom: 0;
        width: 2px;
        background: var(--sb-tint-accent-border);
      }
      .ilc__paso-texto {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding-top: 2px;
      }
      .ilc__num {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: var(--section-number-size);
        height: var(--section-number-size);
        border-radius: var(--radius-full);
        background: var(--sb-slate);
        color: var(--sb-on-slate);
        font-size: var(--text-body-sm);
        font-weight: var(--font-weight-bold);
      }
      .ilc__num[data-paso='0'] {
        background: var(--sb-primary);
        color: var(--sb-on-primary);
      }
      .ilc__num[data-paso='2'] {
        background: var(--sb-tertiary);
        color: var(--sb-on-primary);
      }
    `,
  ],
})
export class InfoListCardComponent {
  @Input({ required: true }) titulo = '';
  @Input() etiqueta: string | null = null;
  @Input() descripcion: string | null = null;
  @Input() icono: string | null = null;
  @Input() items: readonly ItemInfoLista[] = [];
  @Input() variante: 'valores' | 'pasos' = 'valores';
  @Input() tono: TonoInfoLista = 'neutral';
}
