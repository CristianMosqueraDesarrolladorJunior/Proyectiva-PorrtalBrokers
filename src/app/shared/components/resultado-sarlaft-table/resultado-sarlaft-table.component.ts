import { Component, Input } from '@angular/core';
import type { ResultadoSarlaft } from '../../../core/models/registro-broker.model';

/**
 * Tabla de resultado SARLAFT tokenizada (Req 24.1, 35.14).
 *
 * Presenta el resultado exitoso de la Consulta_SARLAFT en una tabla de dos
 * columnas con las filas FECHA DE EXPEDICIÓN, ESTADO ("Vigente") y VIGENCIA
 * ("Menor a 3 años"), conforme al Req 3.15. Todos los estilos se referencian
 * vía Design_Token (Req 25).
 *
 * Usa una estructura de tabla accesible (`<table>` con `<th scope="row">`).
 *
 * Uso:
 * ```html
 * <app-resultado-sarlaft-table [resultado]="resultadoSarlaft"></app-resultado-sarlaft-table>
 * ```
 */
@Component({
  selector: 'app-resultado-sarlaft-table',
  standalone: true,
  templateUrl: './resultado-sarlaft-table.component.html',
  styleUrl: './resultado-sarlaft-table.component.scss',
})
export class ResultadoSarlaftTableComponent {
  /** Resultado de la Consulta_SARLAFT a renderizar (Req 3.15). */
  @Input({ required: true }) resultado!: ResultadoSarlaft;
}
