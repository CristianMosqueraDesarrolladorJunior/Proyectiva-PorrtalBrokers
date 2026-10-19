import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { EscaleritaLoaderComponent } from '../../escalerita-loader/escalerita-loader.component';
import type { VarianteCarga } from '../feedback.types';

/**
 * Overlay de carga con la escalerita. `pantalla` cubre todo y bloquea la interacción (lo usa
 * `FeedbackService.cargando()`); `inline` cubre solo al contenedor anfitrión, que debe tener
 * `position: relative`.
 *
 * ```html
 * <section style="position: relative">
 *   <app-overlay-carga variante="inline" [visible]="guardando()" mensaje="Guardando..." />
 * </section>
 * ```
 */
@Component({
  selector: 'app-overlay-carga',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EscaleritaLoaderComponent],
  styleUrl: './overlay-carga.component.scss',
  template: `
    @if (visible()) {
      <div [class]="'oc oc--' + variante()" aria-busy="true">
        <div class="oc__panel">
          <app-escalerita-loader [texto]="mensaje()" />
        </div>
      </div>
    }
  `,
})
export class OverlayCargaComponent {
  readonly visible = input(false);
  readonly variante = input<VarianteCarga>('inline');
  readonly mensaje = input('Cargando...');
}
