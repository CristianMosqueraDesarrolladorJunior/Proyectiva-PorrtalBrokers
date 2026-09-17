import { Component, Input } from '@angular/core';

/**
 * Loader animado "escalerita" tokenizado (Req 24.1, 35.14).
 *
 * Muestra tres barras que se animan en secuencia (efecto de escalera) junto a
 * un texto de estado configurable (por ejemplo, "Consultando SARLAFT..." o
 * "Enviando solicitud..."). Todos los colores/tamaños se referencian vía
 * Design_Token (Req 25).
 *
 * Expone `role="status"` con `aria-live="polite"` para anunciar el progreso a
 * las tecnologías de asistencia (Req 27.4).
 *
 * Uso:
 * ```html
 * <app-escalerita-loader texto="Consultando SARLAFT..."></app-escalerita-loader>
 * ```
 */
@Component({
  selector: 'app-escalerita-loader',
  standalone: true,
  templateUrl: './escalerita-loader.component.html',
  styleUrl: './escalerita-loader.component.scss',
})
export class EscaleritaLoaderComponent {
  /** Texto de estado mostrado junto a la animación. */
  @Input() texto = 'Cargando...';

  /** Barras de la animación escalerita (secuencia de escalones). */
  protected readonly barras: readonly number[] = [0, 1, 2, 3];
}
