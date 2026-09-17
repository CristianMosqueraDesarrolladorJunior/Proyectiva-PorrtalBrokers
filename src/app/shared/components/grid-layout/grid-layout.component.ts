import { Component, Input } from '@angular/core';

/** Tipos de rejilla del prototipo (Req 35.4). */
export type TipoGrid =
  | 'dash-grid'
  | 'kpi-grid'
  | 'form-grid'
  | 'two-col'
  | 'tracking-cards';

/**
 * Contenedor de rejilla tokenizado (Req 24.1, 35.4).
 *
 * Encapsula los layouts del prototipo (dash-grid, kpi-grid, form-grid,
 * two-col con col-main/col-side y tracking-cards) mediante un input de tipo.
 * El contenido se proyecta; para `two-col`, proyecte los hijos con las clases
 * `col-main` y `col-side`. Todos los espaciados/columnas vía Design_Token
 * (Req 25) y comportamiento responsivo con los mixins de breakpoint.
 *
 * Uso:
 * ```html
 * <app-grid-layout tipo="kpi-grid">
 *   <app-card variante="kpi">...</app-card>
 * </app-grid-layout>
 *
 * <app-grid-layout tipo="two-col">
 *   <div class="col-main">...</div>
 *   <div class="col-side">...</div>
 * </app-grid-layout>
 * ```
 */
@Component({
  selector: 'app-grid-layout',
  standalone: true,
  templateUrl: './grid-layout.component.html',
  styleUrl: './grid-layout.component.scss',
})
export class GridLayoutComponent {
  /** Tipo de rejilla a aplicar (Req 35.4). */
  @Input() tipo: TipoGrid = 'form-grid';
}
