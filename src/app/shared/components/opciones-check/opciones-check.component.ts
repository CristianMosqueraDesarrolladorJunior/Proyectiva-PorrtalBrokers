import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { IconComponent } from '../icon/icon.component';

/** Opción de la rejilla de casillas con icono. */
export interface OpcionCheck {
  readonly valor: string;
  readonly etiqueta: string;
  readonly icono: string;
}

/**
 * OpcionesCheckComponent — rejilla de tarjetas con casilla para elegir una o varias opciones (p. ej. las áreas de una
 * solicitud de soporte). Recibe `[opciones]` y la selección por `[(seleccion)]`. Accesible: cada tarjeta es un
 * `checkbox` con foco visible y se activa con Espacio/Enter.
 */
@Component({
  selector: 'app-opciones-check',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './opciones-check.component.html',
  styleUrl: './opciones-check.component.scss',
})
export class OpcionesCheckComponent {
  @Input({ required: true }) opciones: readonly OpcionCheck[] = [];
  @Input() seleccion: readonly string[] = [];
  @Input() ariaLabel = 'Opciones';
  @Output() seleccionChange = new EventEmitter<readonly string[]>();

  protected marcada(valor: string): boolean {
    return this.seleccion.includes(valor);
  }

  protected alternar(valor: string): void {
    this.seleccionChange.emit(
      this.marcada(valor) ? this.seleccion.filter((v) => v !== valor) : [...this.seleccion, valor],
    );
  }

  protected teclado(evento: KeyboardEvent, valor: string): void {
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault();
      this.alternar(valor);
    }
  }
}
