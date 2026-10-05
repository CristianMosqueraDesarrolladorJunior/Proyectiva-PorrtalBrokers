import { Component, EventEmitter, Input, Output } from '@angular/core';

/** Variante de color del ícono de éxito (Req 35.13). */
export type VarianteIconoExito = 'success' | 'accent';

/** Tarjeta de seguimiento mostrada bajo el mensaje de éxito (Req 35.13). */
export interface TarjetaSeguimiento {
  /** Etiqueta breve en mayúsculas (por ejemplo, "ESTADO", "RADICADO"). */
  readonly etiqueta: string;
  /** Valor destacado de la tarjeta (por ejemplo, "🟡 En proceso"). */
  readonly valor: string;
}

/**
 * Pantalla de éxito tokenizada (Req 24.1, 35.13).
 *
 * Encapsula el patrón `.success-screen` del prototipo: ícono de éxito circular,
 * título, mensaje descriptivo, tarjetas de seguimiento (`.tracking-cards` /
 * `.track-card`) y una acción "Volver". Todos los estilos se referencian vía
 * Design_Token (Req 25); incluye foco visible y ARIA (Req 27.3, 27.4).
 *
 * Uso:
 * ```html
 * <app-success-screen
 *   titulo="¡Documentos recibidos!"
 *   mensaje="Recibirás la renovación 5 días hábiles después del vencimiento."
 *   [tarjetas]="[{ etiqueta: 'ESTADO', valor: '🟡 En proceso' }]"
 *   (volver)="irAlPanel()"
 * ></app-success-screen>
 * ```
 */
@Component({
  selector: 'app-success-screen',
  standalone: true,
  templateUrl: './success-screen.component.html',
  styleUrl: './success-screen.component.scss',
})
export class SuccessScreenComponent {
  /** Título principal de la pantalla de éxito. */
  @Input() titulo = '';

  /** Mensaje descriptivo bajo el título. */
  @Input() mensaje: string | null = null;

  /** Ícono mostrado dentro del círculo de éxito. */
  @Input() icono = 'check';

  /** Variante de color del ícono de éxito. */
  @Input() varianteIcono: VarianteIconoExito = 'success';

  /** Tarjetas de seguimiento mostradas bajo el mensaje. */
  @Input() tarjetas: readonly TarjetaSeguimiento[] = [];

  /** Etiqueta del botón de retorno. */
  @Input() textoVolver = 'Volver';

  /** Muestra u oculta la acción "Volver". */
  @Input() mostrarVolver = true;

  /** Emite cuando el usuario activa la acción "Volver". */
  @Output() volver = new EventEmitter<void>();

  /** Notifica la acción de retorno al contenedor. */
  onVolver(): void {
    this.volver.emit();
  }
}
