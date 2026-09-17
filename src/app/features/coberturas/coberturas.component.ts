import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import {
  CoberturasService,
  CoberturaCatalogo,
} from '../../core/services/coberturas.service';
import {
  CardComponent,
  ToggleSwitchComponent,
  DrawerDetalleComponent,
  FilaDetalle,
} from '../../shared/components';
import {
  decrementarMonto,
  incrementarMonto,
  MONTO_MINIMO_COBERTURA,
} from '../../shared/util/monto-escalonado';

/**
 * Estado de presentación de una Cobertura en la sección (Req 14).
 * `activa` refleja el toggle; `montoAsegurado` es el monto en pasos de $500.000.
 */
interface EstadoCobertura {
  readonly catalogo: CoberturaCatalogo;
  activa: boolean;
  montoAsegurado: number;
}

/**
 * Sección Coberturas (Req 14).
 *
 * Presenta cada Cobertura del catálogo (`GET /api/v1/coberturas`) como una
 * `CardComponent` variante `cobertura-card` con un `ToggleSwitchComponent`
 * (Req 14.1). Activar el toggle marca la Cobertura como activa y muestra el
 * control de monto; desactivarlo la marca inactiva y oculta el control
 * (Req 14.2, 14.3). El control de monto ajusta el valor en pasos de $500.000,
 * mínimo $0 y sin negativos reutilizando la lógica pura de escalonamiento
 * (Property 6) (Req 14.4). "Consultar detalle" abre el detalle de la Cobertura
 * en el `DrawerDetalleComponent` reutilizado (Req 14.5).
 *
 * Standalone + `inject()`; estilos solo vía Design_Token; tipado estricto.
 */
@Component({
  selector: 'app-coberturas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, CardComponent, ToggleSwitchComponent, DrawerDetalleComponent],
  templateUrl: './coberturas.component.html',
  styleUrl: './coberturas.component.scss',
})
export class CoberturasComponent {
  private readonly coberturasService = inject(CoberturasService);

  /** Estado de las coberturas del catálogo con su selección y monto. */
  protected readonly coberturas = signal<readonly EstadoCobertura[]>([]);

  /** Indica si el catálogo se está cargando desde el API_Backend. */
  protected readonly cargando = signal(true);

  /** Mensaje de error genérico si falla la carga del catálogo. */
  protected readonly error = signal<string | null>(null);

  /** Controla la visibilidad del Drawer_Detalle de la Cobertura (Req 14.5). */
  protected readonly detalleAbierto = signal(false);

  /** Cobertura cuyo detalle se muestra en el drawer, si existe. */
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
    return [
      { etiqueta: 'Cobertura', valor: cobertura.nombre },
      { etiqueta: 'Descripción', valor: cobertura.descripcion },
    ];
  }

  /** trackBy de la lista de coberturas para render eficiente. */
  protected trackCobertura(_indice: number, estado: EstadoCobertura): string {
    return estado.catalogo.id;
  }

  /**
   * Aplica el estado del toggle a una Cobertura: activa/inactiva (Req 14.2, 14.3).
   * Al activarla se muestra el control de monto; al desactivarla se oculta.
   * @param id identificador de la Cobertura.
   * @param activa nuevo estado del toggle.
   */
  protected alternarCobertura(id: string, activa: boolean): void {
    this.coberturas.update((lista) =>
      lista.map((estado) =>
        estado.catalogo.id === id ? { ...estado, activa } : estado,
      ),
    );
  }

  /**
   * Incrementa el monto asegurado de una Cobertura en un paso de $500.000 (Req 14.4).
   * @param id identificador de la Cobertura.
   */
  protected incrementar(id: string): void {
    this.actualizarMonto(id, (monto) => incrementarMonto(monto));
  }

  /**
   * Decrementa el monto asegurado de una Cobertura en un paso de $500.000 sin
   * permitir valores negativos (mínimo $0) (Req 14.4).
   * @param id identificador de la Cobertura.
   */
  protected decrementar(id: string): void {
    this.actualizarMonto(id, (monto) => decrementarMonto(monto));
  }

  /**
   * Abre el Drawer_Detalle con la información de la Cobertura seleccionada (Req 14.5).
   * @param cobertura Cobertura del catálogo a consultar.
   */
  protected consultarDetalle(cobertura: CoberturaCatalogo): void {
    this.coberturaDetalle.set(cobertura);
    this.detalleAbierto.set(true);
  }

  /** Cierra el Drawer_Detalle de la Cobertura (Req 14.5). */
  protected cerrarDetalle(): void {
    this.detalleAbierto.set(false);
  }

  /** Reintenta la carga del catálogo tras un error. */
  protected reintentar(): void {
    this.cargarCatalogo();
  }

  /** Aplica una transformación pura de escalonamiento al monto de una Cobertura. */
  private actualizarMonto(id: string, transformar: (monto: number) => number): void {
    this.coberturas.update((lista) =>
      lista.map((estado) =>
        estado.catalogo.id === id
          ? { ...estado, montoAsegurado: transformar(estado.montoAsegurado) }
          : estado,
      ),
    );
  }

  /** Consume el catálogo de coberturas del API_Backend (Req 14.1). */
  private cargarCatalogo(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.coberturasService.listar().subscribe({
      next: (catalogo) => {
        this.coberturas.set(
          catalogo.map((cobertura) => ({
            catalogo: cobertura,
            activa: false,
            montoAsegurado: Math.max(MONTO_MINIMO_COBERTURA, cobertura.montoDefecto),
          })),
        );
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No fue posible cargar las coberturas. Intenta nuevamente.');
        this.cargando.set(false);
      },
    });
  }
}
