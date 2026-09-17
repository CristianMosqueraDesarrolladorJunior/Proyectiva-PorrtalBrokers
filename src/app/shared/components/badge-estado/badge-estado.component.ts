import { Component, Input } from '@angular/core';

/** Variantes de insignia de estado del prototipo (Req 35.2). */
export type VarianteBadge = 'success' | 'info' | 'warning' | 'danger';

/**
 * Insignia de estado tokenizada (Req 24.1, 35.2).
 *
 * Encapsula las variantes del prototipo (badge-success/info/warning/danger)
 * y un punto (dot) de color opcional. Todos los colores se referencian vía
 * Design_Token (Req 25). El texto del estado se proyecta como contenido.
 *
 * Uso:
 * ```html
 * <app-badge-estado variante="success">Aprobada</app-badge-estado>
 * <app-badge-estado variante="danger" [conPunto]="true">Bloqueada</app-badge-estado>
 * ```
 */
@Component({
  selector: 'app-badge-estado',
  standalone: true,
  templateUrl: './badge-estado.component.html',
  styleUrl: './badge-estado.component.scss',
})
export class BadgeEstadoComponent {
  /** Variante de color de la insignia (Req 35.2). */
  @Input() variante: VarianteBadge = 'info';

  /** Muestra un punto de color antes del texto (Req 35.2). */
  @Input() conPunto = false;
}
