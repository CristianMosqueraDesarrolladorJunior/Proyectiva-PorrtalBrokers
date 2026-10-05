import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Panel de "Filtrado Inteligente" colapsable tokenizado (Req 24.1, 35.8).
 *
 * Encapsula el patrón `.filtrado-inteligente` del prototipo: un encabezado
 * clicable (`.filtrado-header`) con ícono, título, contador opcional de filtros
 * y un chevron que rota, más un cuerpo colapsable (`.filtrado-body`) donde se
 * proyectan los controles de filtro. Todos los estilos se referencian vía
 * Design_Token (Req 25).
 *
 * El estado abierto/cerrado es controlable desde el contenedor mediante
 * `abierto` y `abiertoChange`, con toggle interno por defecto. Expone ARIA de
 * divulgación (`aria-expanded`, `aria-controls`) y foco visible (Req 27.3).
 *
 * Uso:
 * ```html
 * <app-filtrado-inteligente [totalFiltros]="5">
 *   <!-- controles de filtro proyectados -->
 * </app-filtrado-inteligente>
 * ```
 */
@Component({
  selector: 'app-filtrado-inteligente',
  standalone: true,
  templateUrl: './filtrado-inteligente.component.html',
  styleUrl: './filtrado-inteligente.component.scss',
})
export class FiltradoInteligenteComponent {
  /** Título del panel. */
  @Input() titulo = 'Filtrado Inteligente';

  /** Ícono decorativo del encabezado (emoji del prototipo). */
  @Input() icono = 'tune';

  /** Número de filtros disponibles; muestra la insignia cuando es mayor a 0. */
  @Input() totalFiltros = 0;

  /** Estado abierto/cerrado del panel (controlable desde el contenedor). */
  @Input() abierto = false;

  /** Identificador del cuerpo colapsable para `aria-controls`. */
  @Input() idCuerpo = 'filtrado-inteligente-body';

  /** Emite el nuevo estado abierto/cerrado al alternar el panel. */
  @Output() abiertoChange = new EventEmitter<boolean>();

  /** Alterna el estado del panel y notifica al contenedor. */
  alternar(): void {
    this.abierto = !this.abierto;
    this.abiertoChange.emit(this.abierto);
  }
}
