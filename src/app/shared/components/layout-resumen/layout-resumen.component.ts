import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Layout de "formulario + resumen en vivo": contenido principal (`<div principal>`) y un panel
 * lateral fijo al hacer scroll (`<aside lateral>`). En tablet/móvil el resumen pasa arriba.
 * Mismo patrón que Cotizador y Radicación, sin CSS propio en cada vista.
 */
@Component({
  selector: 'app-layout-resumen',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lr">
      <div class="lr__principal"><ng-content select="[principal]"></ng-content></div>
      <aside class="lr__lateral" [attr.aria-label]="etiquetaLateral" aria-live="polite">
        <ng-content select="[lateral]"></ng-content>
      </aside>
    </div>
  `,
  styleUrl: './layout-resumen.component.scss',
})
export class LayoutResumenComponent {
  @Input() etiquetaLateral = 'Resumen';
}
