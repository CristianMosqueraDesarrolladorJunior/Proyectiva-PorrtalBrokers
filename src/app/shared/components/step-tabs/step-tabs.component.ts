import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

import { IconComponent } from '../icon/icon.component';

/** Estado visual de una pestaña de paso. */
export type EstadoPasoTab = 'pendiente' | 'activo' | 'completado';

/** Paso con etiqueta y descripción corta opcional. */
export interface PasoTab {
  readonly etiqueta: string;
  readonly descripcion?: string;
}

/**
 * StepTabsComponent — pestañas de paso a paso del portal (reemplaza al stepper).
 *
 * Único componente para cualquier flujo por pasos (radicación, renovaciones,
 * contrato, nuevo negocio, corrección). Muestra cada paso como pestaña con su
 * número (o check al completarse), una barra de progreso y el resumen
 * "Paso X de N". Con `navegable`, las pestañas completadas son botones que
 * emiten `pasoSeleccionado` para volver atrás; los pasos futuros nunca se
 * pueden seleccionar, así que no se saltan validaciones.
 *
 * Accesibilidad: `nav` + lista ordenada, `aria-current="step"` en el paso activo
 * y barra con `role="progressbar"`. En pantallas angostas las pestañas muestran
 * solo su marca y el nombre del paso activo queda en el resumen.
 */
@Component({
  selector: 'app-step-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, IconComponent],
  templateUrl: './step-tabs.component.html',
  styleUrl: './step-tabs.component.scss',
})
export class StepTabsComponent {
  /** Pasos en orden: texto simple o etiqueta + descripción. */
  @Input({ required: true }) pasos: readonly (string | PasoTab)[] = [];

  /** Índice del paso activo (0-indexado). */
  @Input() pasoActivo = 0;

  /** Permite volver a pasos completados haciendo clic en su pestaña. */
  @Input() navegable = false;

  /** Nombre accesible del indicador. */
  @Input() ariaLabel = 'Progreso por pasos';

  /** Índice del paso completado que el usuario eligió para volver. */
  @Output() readonly pasoSeleccionado = new EventEmitter<number>();

  protected get total(): number {
    return this.pasos.length;
  }

  /** Índice activo acotado al rango de pasos. */
  protected get indiceActivo(): number {
    return Math.min(Math.max(this.pasoActivo, 0), Math.max(this.total - 1, 0));
  }

  /** Porcentaje de avance para la barra (0 en el primer paso, 100 en el último). */
  protected get progreso(): number {
    return this.total > 1 ? Math.round((this.indiceActivo / (this.total - 1)) * 100) : 100;
  }

  protected etiqueta(paso: string | PasoTab): string {
    return typeof paso === 'string' ? paso : paso.etiqueta;
  }

  protected descripcion(paso: string | PasoTab): string | null {
    return typeof paso === 'string' ? null : (paso.descripcion ?? null);
  }

  protected estado(indice: number): EstadoPasoTab {
    if (indice < this.indiceActivo) {
      return 'completado';
    }
    return indice === this.indiceActivo ? 'activo' : 'pendiente';
  }

  /** Solo los pasos completados son navegables, y solo si el host lo permite. */
  protected esNavegable(indice: number): boolean {
    return this.navegable && this.estado(indice) === 'completado';
  }

  protected seleccionar(indice: number): void {
    if (this.esNavegable(indice)) {
      this.pasoSeleccionado.emit(indice);
    }
  }
}
