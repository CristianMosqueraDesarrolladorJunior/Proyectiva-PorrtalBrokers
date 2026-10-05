import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { IconComponent } from '../icon/icon.component';

export type TonoCallout = 'info' | 'accent' | 'success' | 'plain';

/**
 * Tarjeta de aviso/sugerencia con icono, título, descripción y acciones
 * proyectadas. Reemplaza los banners ad-hoc: sugerencias del Copilot,
 * "Agilidad en el cierre", tarjetas de pie de página, etc.
 * Acciones: `<div acciones>…</div>`.
 */
@Component({
  selector: 'app-callout-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <aside class="cc" [attr.data-tono]="tono">
      <span class="cc__icono" aria-hidden="true">
        <app-icon [nombre]="icono" [tamano]="24" />
      </span>
      <div class="cc__texto">
        @if (etiqueta) {
          <span class="cc__etiqueta">{{ etiqueta }}</span>
        }
        <h3 class="cc__titulo">{{ titulo }}</h3>
        @if (descripcion) {
          <p class="cc__descripcion">{{ descripcion }}</p>
        }
        <ng-content></ng-content>
      </div>
      <div class="cc__acciones"><ng-content select="[acciones]"></ng-content></div>
    </aside>
  `,
  styles: [
    `
      .cc {
        display: flex;
        align-items: center;
        gap: var(--space-4);
        padding: var(--space-4) var(--space-5);
        border: 1px solid var(--sb-border);
        border-radius: var(--radius-xl);
        background: var(--sb-surface);
        box-shadow: var(--sb-shadow-1);
      }
      .cc[data-tono='info'] {
        background: var(--sb-surface-low);
        border-color: var(--sb-surface-high);
      }
      .cc[data-tono='accent'] {
        background: var(--sb-tint-accent-bg);
        border-color: var(--sb-tint-accent-border);
      }
      .cc[data-tono='success'] {
        background: var(--sb-tint-success-bg);
        border-color: var(--sb-tint-success-border);
      }
      .cc__icono {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 48px;
        height: 48px;
        border-radius: var(--radius-lg);
        background: var(--sb-slate);
        color: var(--sb-on-slate);
      }
      .cc__texto {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
      }
      .cc__etiqueta {
        align-self: flex-start;
        padding: 0 var(--space-2);
        border-radius: var(--radius-pill);
        background: var(--sb-tertiary-fixed);
        color: var(--sb-tertiary);
        font-size: var(--text-caption);
        font-weight: var(--font-weight-bold);
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .cc__titulo {
        margin: 0;
        font-size: var(--text-body);
        font-weight: var(--font-weight-semibold);
        color: var(--sb-on-surface);
      }
      .cc__descripcion {
        margin: 0;
        font-size: var(--text-body-sm);
        color: var(--sb-secondary);
      }
      .cc__acciones {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
      }
      .cc__acciones:empty {
        display: none;
      }
      @media (width <= 639px) {
        .cc {
          flex-direction: column;
          align-items: flex-start;
        }
        .cc__acciones {
          width: 100%;
        }
      }
    `,
  ],
})
export class CalloutCardComponent {
  @Input() icono = 'lightbulb';
  @Input({ required: true }) titulo = '';
  @Input() descripcion: string | null = null;
  @Input() etiqueta: string | null = null;
  @Input() tono: TonoCallout = 'plain';
}
