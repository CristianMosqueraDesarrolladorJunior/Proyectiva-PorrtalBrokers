import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Estado visual de un paso del stepper (Req 35.9). */
export type EstadoPaso = 'pending' | 'active' | 'done';

/**
 * StepperComponent — Componente_Compartido de indicador de pasos (Req 35.9, 24.3).
 *
 * Encapsula `stepper` con los estados `step`, `active` y `done` del prototipo,
 * totalmente tokenizado. Recibe la lista de pasos y el índice del paso activo
 * (0-indexado) por `@Input()`; los pasos anteriores al activo se marcan como
 * completados (`done`) y los posteriores como pendientes.
 *
 * Accesibilidad: se expone como lista ordenada con `aria-current="step"` en el
 * paso activo (Req 27.1, 27.5).
 */
@Component({
  selector: 'app-stepper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stepper.component.html',
  styleUrl: './stepper.component.scss',
})
export class StepperComponent {
  /** Etiquetas de los pasos en orden. */
  @Input({ required: true }) pasos: readonly string[] = [];

  /** Índice del paso activo (0-indexado). */
  @Input() pasoActivo = 0;

  /** Devuelve el estado visual de un paso según su índice. */
  protected estadoPaso(indice: number): EstadoPaso {
    if (indice < this.pasoActivo) {
      return 'done';
    }
    if (indice === this.pasoActivo) {
      return 'active';
    }
    return 'pending';
  }

  /** trackBy de pasos para render eficiente. */
  protected trackPaso(indice: number): number {
    return indice;
  }
}
