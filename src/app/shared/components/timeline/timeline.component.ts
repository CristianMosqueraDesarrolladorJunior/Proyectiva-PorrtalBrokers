import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Hito de la línea de tiempo del Detalle_Solicitud (Req 34.2). */
export interface HitoTimeline {
  readonly titulo: string;
  readonly fecha: string;
  readonly completado: boolean;
}

/**
 * TimelineComponent — Componente_Compartido de línea de tiempo de hitos del
 * Detalle_Solicitud (Req 34.2, 24.1).
 *
 * Encapsula `timeline` / `timeline-item` del prototipo, totalmente tokenizado.
 * Recibe la lista de hitos por `@Input()`; los hitos completados se resaltan
 * respecto a los pendientes.
 *
 * Accesibilidad: se expone como lista ordenada; cada hito indica su estado de
 * avance por texto accesible además del estilo visual (Req 27.1).
 */
@Component({
  selector: 'app-timeline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './timeline.component.html',
  styleUrl: './timeline.component.scss',
})
export class TimelineComponent {
  /** Hitos a mostrar en orden cronológico. */
  @Input({ required: true }) hitos: readonly HitoTimeline[] = [];

  /** trackBy de hitos para render eficiente. */
  protected trackHito(indice: number): number {
    return indice;
  }
}
