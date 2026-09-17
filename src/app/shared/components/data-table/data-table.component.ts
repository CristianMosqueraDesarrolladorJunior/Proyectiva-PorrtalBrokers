import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { BadgeEstadoComponent, VarianteBadge } from '../badge-estado/badge-estado.component';
import { BotonComponent } from '../boton/boton.component';

/**
 * Definición de una columna de la tabla de datos (Req 35.5).
 * `key` identifica la propiedad de la fila; `header` es la etiqueta visible.
 */
export interface ColumnaTabla {
  readonly key: string;
  readonly header: string;
  /**
   * Tipo de celda. `'badge'` renderiza una insignia de estado coloreada (Req 6.3,
   * 16.3): el texto se toma de `fila[key]` y la variante de `fila[key + 'Variante']`.
   * `'accion'` renderiza un botón de acción por fila (emite `accion`). Por
   * defecto, `'texto'`.
   */
  readonly tipo?: 'texto' | 'badge' | 'accion';
  /** Habilita el ordenamiento por esta columna (Req UX de tabla reutilizable). */
  readonly ordenable?: boolean;
  /** Etiqueta del botón cuando `tipo === 'accion'`. */
  readonly textoAccion?: string;
  /** Alineación del contenido de la celda. */
  readonly alinear?: 'izquierda' | 'centro' | 'derecha';
}

/** Fila genérica de la tabla: mapa de clave de columna a valor mostrable. */
export type FilaTabla = Readonly<Record<string, string | number>>;

/** Dirección de ordenamiento de una columna. */
export type DireccionOrden = 'asc' | 'desc';

/** Evento de acción de fila (botón de la columna `'accion'`). */
export interface AccionFila {
  readonly indice: number;
  readonly columna: string;
}

/**
 * DataTableComponent — Componente_Compartido de tabla de datos reutilizable
 * (Req 35.5, 6.5, 24.3).
 *
 * Integra `table-wrapper`, `data-table`, `table-footer` y paginación (`pg`) del
 * prototipo, totalmente tokenizado. Además del listado y la paginación, aporta:
 * - **Búsqueda incrustada** opcional sobre todas las celdas de texto (`[conBusqueda]`).
 * - **Ordenamiento** por columnas marcadas `ordenable` (clic en el encabezado).
 * - **Celdas tipo badge** (insignia de estado) y **tipo acción** (botón por fila).
 *
 * Es agnóstico del dominio: recibe columnas y filas por `@Input` y emite eventos
 * de página, selección de fila y acción. Reutilizable en toda la plataforma
 * (Seguimiento, Estado de referidos, Pólizas, etc.). Standalone, accesible por
 * teclado con foco visible y ARIA (Req 27.1, 27.5).
 */
@Component({
  selector: 'app-data-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, BadgeEstadoComponent, BotonComponent],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
})
export class DataTableComponent {
  /** Columnas a renderizar en el encabezado y las celdas. */
  @Input({ required: true }) columnas: readonly ColumnaTabla[] = [];

  /** Filas de la página actual (ya paginadas por el contenedor/backend). */
  @Input({ required: true })
  set filas(valor: readonly FilaTabla[]) {
    this._filas.set(valor ?? []);
  }
  get filas(): readonly FilaTabla[] {
    return this._filas();
  }
  private readonly _filas = signal<readonly FilaTabla[]>([]);

  /** Número total de registros del listado completo (Req 6.5). */
  @Input() total = 0;

  /** Página actual (1-indexada). */
  @Input() paginaActual = 1;

  /** Tamaño de página (por defecto 10 solicitudes por página, Req 6.5). */
  @Input() tamanoPagina = 10;

  /** Muestra la barra de búsqueda incrustada sobre la tabla. */
  @Input() conBusqueda = false;

  /** Placeholder de la búsqueda incrustada. */
  @Input() placeholderBusqueda = 'Buscar...';

  /** Texto accesible de la tabla para lectores de pantalla. */
  @Input() ariaLabel = 'Tabla de datos';

  /** Emite la página solicitada (1-indexada) al cambiar de página. */
  @Output() cambioPagina = new EventEmitter<number>();

  /** Emite el índice de la fila seleccionada dentro de la página actual. */
  @Output() seleccionFila = new EventEmitter<number>();

  /** Emite cuando se activa el botón de una columna de acción. */
  @Output() accion = new EventEmitter<AccionFila>();

  /** Texto de búsqueda incrustada. */
  protected readonly busqueda = signal('');

  /** Columna por la que se ordena actualmente; vacío = sin orden. */
  protected readonly columnaOrden = signal('');

  /** Dirección del orden actual. */
  protected readonly direccionOrden = signal<DireccionOrden>('asc');

  /** Filas visibles tras aplicar búsqueda incrustada y ordenamiento. */
  protected readonly filasVisibles = computed(() => {
    let filas = this._filas().slice();
    const texto = this.busqueda().trim().toLowerCase();
    if (texto) {
      filas = filas.filter((fila) =>
        this.columnas.some((c) =>
          String(fila[c.key] ?? '').toLowerCase().includes(texto),
        ),
      );
    }
    const clave = this.columnaOrden();
    if (clave) {
      const dir = this.direccionOrden() === 'asc' ? 1 : -1;
      filas.sort((a, b) => comparar(a[clave], b[clave]) * dir);
    }
    return filas;
  });

  /** Número total de páginas, mínimo 1 para evitar estados vacíos. */
  protected readonly totalPaginas = computed(() => this.calcularTotalPaginas());

  /** Lista de números de página para los controles de paginación. */
  protected get paginas(): number[] {
    const paginas = Math.max(1, this.calcularTotalPaginas());
    return Array.from({ length: paginas }, (_, indice) => indice + 1);
  }

  /** Calcula el total de páginas a partir de total y tamaño de página. */
  private calcularTotalPaginas(): number {
    if (this.tamanoPagina <= 0) {
      return 1;
    }
    return Math.max(1, Math.ceil(this.total / this.tamanoPagina));
  }

  /** Alterna el ordenamiento por una columna ordenable. */
  protected ordenarPor(columna: ColumnaTabla): void {
    if (!columna.ordenable) {
      return;
    }
    if (this.columnaOrden() === columna.key) {
      this.direccionOrden.set(this.direccionOrden() === 'asc' ? 'desc' : 'asc');
    } else {
      this.columnaOrden.set(columna.key);
      this.direccionOrden.set('asc');
    }
  }

  /** Indicador de orden mostrado en el encabezado (▲/▼/⇅). */
  protected iconoOrden(columna: ColumnaTabla): string {
    if (!columna.ordenable) {
      return '';
    }
    if (this.columnaOrden() !== columna.key) {
      return '⇅';
    }
    return this.direccionOrden() === 'asc' ? '▲' : '▼';
  }

  /** Solicita la navegación a la página indicada si es válida y distinta. */
  protected irAPagina(pagina: number): void {
    const paginas = Math.max(1, this.calcularTotalPaginas());
    if (pagina < 1 || pagina > paginas || pagina === this.paginaActual) {
      return;
    }
    this.cambioPagina.emit(pagina);
  }

  /** Notifica la selección de una fila (índice dentro de la página original). */
  protected onSeleccionarFila(fila: FilaTabla): void {
    this.seleccionFila.emit(this.indiceOriginal(fila));
  }

  /** Notifica la acción de una fila desde la columna de acción. */
  protected onAccion(fila: FilaTabla, columna: ColumnaTabla): void {
    this.accion.emit({ indice: this.indiceOriginal(fila), columna: columna.key });
  }

  /** Devuelve el valor a mostrar en una celda de forma segura. */
  protected valorCelda(fila: FilaTabla, columna: ColumnaTabla): string | number {
    return fila[columna.key] ?? '';
  }

  /**
   * Variante de insignia para una celda tipo `'badge'` (Req 6.3, 16.3).
   * Lee `fila[columna.key + 'Variante']`; usa `info` como default seguro.
   */
  protected varianteBadge(fila: FilaTabla, columna: ColumnaTabla): VarianteBadge {
    const variante = fila[`${columna.key}Variante`];
    if (variante === 'success' || variante === 'warning' || variante === 'danger') {
      return variante;
    }
    return 'info';
  }

  /** Índice de la fila en el arreglo original (no en el filtrado/ordenado). */
  private indiceOriginal(fila: FilaTabla): number {
    return this._filas().indexOf(fila);
  }

  /** trackBy de columnas para render eficiente. */
  protected trackColumna(_indice: number, columna: ColumnaTabla): string {
    return columna.key;
  }

  /** trackBy de filas. */
  protected trackFila(indice: number): number {
    return indice;
  }
}

/** Comparador estable de valores de celda (numérico o textual). */
function comparar(a: string | number | undefined, b: string | number | undefined): number {
  const va = a ?? '';
  const vb = b ?? '';
  if (typeof va === 'number' && typeof vb === 'number') {
    return va - vb;
  }
  return String(va).localeCompare(String(vb), 'es', { numeric: true });
}
