import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Barra de herramientas de un listado: filtros a la izquierda (`<div filtros>`)
 * y acciones a la derecha (`<div acciones>`). Se apila en móvil.
 */
@Component({
  selector: 'app-barra-acciones',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ba" role="toolbar">
      <div class="ba__filtros"><ng-content select="[filtros]"></ng-content></div>
      <div class="ba__acciones"><ng-content select="[acciones]"></ng-content></div>
    </div>
  `,
  styles: [
    `
      .ba {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-3) var(--space-4);
        padding: var(--space-3) var(--space-4);
        border: 1px solid var(--sb-border);
        border-radius: var(--radius-xl);
        background: var(--sb-surface);
        box-shadow: var(--sb-shadow-1);
      }
      .ba__filtros,
      .ba__acciones {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--space-3);
      }
      .ba__acciones {
        margin-left: auto;
      }
      .ba__filtros:empty,
      .ba__acciones:empty {
        display: none;
      }
    `,
  ],
})
export class BarraAccionesComponent {}
