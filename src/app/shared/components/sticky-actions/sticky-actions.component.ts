import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Barra de acciones de formulario: nota opcional + acciones secundarias a la
 * izquierda (`[secundarias]`) y la acción principal a la derecha (`[principal]`).
 * `fija` la ancla al borde inferior del viewport (formularios largos).
 */
@Component({
  selector: 'app-sticky-actions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sa" [class.sa--fija]="fija">
      @if (nota) {
        <p class="sa__nota">{{ nota }}</p>
      }
      <div class="sa__fila">
        <div class="sa__secundarias"><ng-content select="[secundarias]"></ng-content></div>
        <div class="sa__principal"><ng-content select="[principal]"></ng-content></div>
      </div>
    </div>
  `,
  styles: [
    `
      .sa {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        padding: var(--space-4) var(--space-5);
        background: var(--sb-surface);
        border: 1px solid var(--sb-border);
        border-radius: var(--radius-xl);
        box-shadow: var(--sb-shadow-2);
      }
      .sa--fija {
        position: sticky;
        bottom: var(--space-4);
        z-index: 10;
      }
      .sa__nota {
        margin: 0;
        padding: var(--space-2) var(--space-3);
        background: var(--sb-tint-accent-bg);
        border-radius: var(--radius-md);
        font-size: var(--text-caption);
        color: var(--sb-on-surface);
      }
      .sa__fila {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: var(--space-3);
      }
      .sa__secundarias,
      .sa__principal {
        display: flex;
        align-items: center;
        gap: var(--space-2);
      }
      @media (width <= 639px) {
        .sa__principal ::ng-deep app-boton,
        .sa__secundarias ::ng-deep app-boton,
        .sa__principal ::ng-deep .boton,
        .sa__secundarias ::ng-deep .boton {
          display: block;
          width: 100%;
        }
        .sa__secundarias {
          width: 100%;
        }
        .sa__fila,
        .sa__principal {
          flex-direction: column-reverse;
          align-items: stretch;
          width: 100%;
        }
      }
    `,
  ],
})
export class StickyActionsComponent {
  @Input() nota: string | null = null;
  @Input() fija = false;
}
