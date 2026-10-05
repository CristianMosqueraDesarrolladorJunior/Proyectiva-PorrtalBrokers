import { Component, Input } from '@angular/core';

/**
 * Caja informativa tokenizada (Req 24.1, 35.12).
 *
 * Encapsula el patrón `.info-box` del prototipo: un bloque de fondo neutro con
 * borde e ícono opcional para avisos contextuales de baja jerarquía. Todos los
 * colores/espaciados/radios se referencian vía Design_Token (Req 25).
 *
 * El contenido se proyecta como slot; admite un ícono decorativo opcional.
 *
 * Uso:
 * ```html
 * <app-info-box icono="event">
 *   <strong>Vigencia:</strong> 12 meses · <strong>Frecuencia:</strong> Mensual
 * </app-info-box>
 * ```
 */
@Component({
  selector: 'app-info-box',
  standalone: true,
  templateUrl: './info-box.component.html',
  styleUrl: './info-box.component.scss',
})
export class InfoBoxComponent {
  /** Ícono decorativo opcional mostrado a la izquierda (emoji del prototipo). */
  @Input() icono: string | null = null;
}
