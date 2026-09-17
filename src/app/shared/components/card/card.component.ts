import { Component, Input } from '@angular/core';

/** Variantes de tarjeta del prototipo (Req 35.3). */
export type VarianteCard =
  | 'commission-card'
  | 'dash-kpi'
  | 'kpi-card'
  | 'form-card'
  | 'cobertura-card'
  | 'track-card';

/**
 * Tarjeta contenedora tokenizada (Req 24.1, 35.3).
 *
 * Encapsula las variantes de tarjeta del prototipo (commission-card, dash-kpi,
 * kpi-card, form-card, cobertura-card, track-card) mediante un input de
 * variante. El contenido se proyecta. Todos los estilos vía Design_Token
 * (Req 25). Marca de estado `danger` para KPIs de alerta (Req 5.4) y estado
 * `active` para cobertura seleccionada.
 *
 * Uso:
 * ```html
 * <app-card variante="commission-card">...</app-card>
 * <app-card variante="dash-kpi" [danger]="true">...</app-card>
 * <app-card variante="cobertura-card" [activa]="cobertura.activa">...</app-card>
 * ```
 */
@Component({
  selector: 'app-card',
  standalone: true,
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
})
export class CardComponent {
  /** Variante visual de la tarjeta (Req 35.3). */
  @Input() variante: VarianteCard = 'form-card';

  /** Estado de alerta para KPIs (aplica el estilo danger, Req 5.4). */
  @Input() danger = false;

  /** Estado activo para cobertura-card (resalta el borde, Req 14). */
  @Input() activa = false;
}
