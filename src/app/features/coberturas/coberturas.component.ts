import { CatalogoService } from '../../core/services/catalogo.service';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import {
  CoberturasService,
  CoberturaCatalogo,
} from '../../core/services/coberturas.service';
import {
  CardComponent,
  DrawerDetalleComponent,
  FilaDetalle,
} from '../../shared/components';

/**
 * Sección Coberturas (Req 14): consulta informativa de las coberturas del catálogo (`GET /api/v1/coberturas`)
 * con su nombre legible y el detalle de `cat_cobertura`. Los montos se eligen en el Cotizador (aquí no se
 * configuran: los interruptores y montos de antes no tenían efecto). "Consultar detalle" abre el drawer.
 */
@Component({
  selector: 'app-coberturas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardComponent, DrawerDetalleComponent],
  templateUrl: './coberturas.component.html',
  styleUrl: './coberturas.component.scss',
})
export class CoberturasComponent {
  private readonly coberturasService = inject(CoberturasService);
  private readonly catalogoBd = inject(CatalogoService);

  /** Nombre legible desde el catálogo `cobertura` (el servicio trae el código, p. ej. `DANOS_FALTANTES`). */
  protected nombreCobertura(cobertura: CoberturaCatalogo): string {
    const etiqueta = this.catalogoBd.etiqueta('cobertura', cobertura.nombre);
    if (etiqueta && etiqueta !== cobertura.nombre) {
      return etiqueta;
    }
    // Un código crudo (MAYUSCULAS_CON_GUION) nunca se muestra: se usa la descripción.
    return /^[A-Z0-9_]+$/.test(cobertura.nombre) && cobertura.descripcion ? cobertura.descripcion : cobertura.nombre;
  }

  /** Detalle de la cobertura (`cat_cobertura.detalle`), si existe. */
  private detalle(cobertura: CoberturaCatalogo): string {
    const item = this.catalogoBd.opciones('cobertura').find((c) => c.codigo === cobertura.nombre);
    return String(item?.['detalle'] ?? '').trim();
  }

  protected readonly coberturas = signal<readonly CoberturaCatalogo[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly detalleAbierto = signal(false);
  protected readonly coberturaDetalle = signal<CoberturaCatalogo | null>(null);

  constructor() {
    this.cargarCatalogo();
  }

  /** Filas etiqueta/valor del detalle de la Cobertura seleccionada (Req 14.5). */
  protected filasDetalle(): readonly FilaDetalle[] {
    const cobertura = this.coberturaDetalle();
    if (!cobertura) {
      return [];
    }
    const detalle = this.detalle(cobertura);
    return [
      { etiqueta: 'Cobertura', valor: this.nombreCobertura(cobertura) },
      { etiqueta: 'Descripción', valor: detalle || cobertura.descripcion },
    ];
  }

  protected consultarDetalle(cobertura: CoberturaCatalogo): void {
    this.coberturaDetalle.set(cobertura);
    this.detalleAbierto.set(true);
  }

  protected cerrarDetalle(): void {
    this.detalleAbierto.set(false);
  }

  protected reintentar(): void {
    this.cargarCatalogo();
  }

  private cargarCatalogo(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.coberturasService.listar().subscribe({
      next: (catalogo) => {
        this.coberturas.set(catalogo);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No fue posible cargar las coberturas. Intenta nuevamente.');
        this.cargando.set(false);
      },
    });
  }
}
