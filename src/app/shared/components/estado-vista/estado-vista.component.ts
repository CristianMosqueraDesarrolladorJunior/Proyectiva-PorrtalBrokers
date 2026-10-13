import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { AlertBannerComponent } from '../alert-banner/alert-banner.component';
import { BotonComponent } from '../boton/boton.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { SkeletonComponent } from '../skeleton/skeleton.component';

/**
 * Envoltura uniforme de los estados de una vista de datos: cargando (skeleton),
 * error (alerta con «Reintentar»), vacío (empty-state) o el contenido proyectado.
 * Evita que cada vista reinvente sus mensajes y estilos de estado.
 */
@Component({
  selector: 'app-estado-vista',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AlertBannerComponent, BotonComponent, EmptyStateComponent, SkeletonComponent],
  template: `
    @if (cargando) {
      <app-skeleton [lineas]="lineas" [alto]="altoLinea" [ariaLabel]="'Cargando ' + entidad" />
    } @else if (error) {
      <app-alert-banner variante="error" titulo="No pudimos cargar la información" icono="cloud_off">
        <span class="ev__error">
          {{ mensajeError }}
          <app-boton variante="ghost" icono="refresh" (clicked)="reintentar.emit()">Reintentar</app-boton>
        </span>
      </app-alert-banner>
    } @else if (vacio) {
      <app-empty-state [icono]="iconoVacio" [titulo]="tituloVacio" [descripcion]="descripcionVacio">
        <div acciones><ng-content select="[accionesVacio]"></ng-content></div>
      </app-empty-state>
    } @else {
      <ng-content></ng-content>
    }
  `,
  styles: [
    `
      .ev__error {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-3);
        width: 100%;
      }
    `,
  ],
})
export class EstadoVistaComponent {
  @Input() cargando = false;
  @Input() error = false;
  @Input() vacio = false;
  /** Nombre de lo que se carga (accesibilidad del skeleton): «negocios», «brokers»… */
  @Input() entidad = 'contenido';
  @Input() lineas = 5;
  @Input() altoLinea = 44;
  @Input() mensajeError = 'Revisa tu conexión e intenta de nuevo.';
  @Input() iconoVacio = 'inbox';
  @Input() tituloVacio = 'Aún no hay información';
  @Input() descripcionVacio: string | null = null;

  @Output() readonly reintentar = new EventEmitter<void>();
}
