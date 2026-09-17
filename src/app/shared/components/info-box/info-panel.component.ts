import { Component, Input } from '@angular/core';

/**
 * Panel informativo lateral tokenizado (Req 24.1, 35.12).
 *
 * Encapsula el patrón `.info-panel` del prototipo (columna lateral con título y
 * contenido explicativo, por ejemplo "Valores Actuales" o "Instrucciones").
 * Todos los colores/espaciados/radios se referencian vía Design_Token (Req 25).
 *
 * El título se renderiza como encabezado accesible (`<h4>`) y el contenido se
 * proyecta como slot.
 *
 * Uso:
 * ```html
 * <app-info-panel titulo="Valores Actuales">
 *   <p>Referencia de tu último periodo facturado</p>
 * </app-info-panel>
 * ```
 */
@Component({
  selector: 'app-info-panel',
  standalone: true,
  templateUrl: './info-panel.component.html',
  styleUrl: './info-panel.component.scss',
})
export class InfoPanelComponent {
  /** Título del panel (encabezado accesible). */
  @Input() titulo: string | null = null;
}
