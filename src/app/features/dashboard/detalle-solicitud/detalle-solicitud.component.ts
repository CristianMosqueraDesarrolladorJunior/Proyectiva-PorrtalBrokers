import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { finalize } from 'rxjs';

import { DashboardService } from '../../../core/services/dashboard.service';
import {
  DetalleSolicitud,
  HitoTimeline,
} from '../../../core/models/solicitud.model';
import {
  DrawerDetalleComponent,
  FilaDetalle,
} from '../../../shared/components/drawer-detalle/drawer-detalle.component';
import { TimelineComponent } from '../../../shared/components/timeline/timeline.component';

/**
 * DetalleSolicitudComponent — Detalle_Solicitud del Seguimiento (Req 34).
 *
 * Al recibir la `referencia` de la fila seleccionada en la tabla de Seguimiento
 * (Req 6.4), obtiene el Detalle_Solicitud desde el API_Backend mediante
 * `DashboardService`/`HttpClient` (`GET /api/v1/solicitudes/{referencia}`,
 * Req 34.4) y lo presenta reutilizando el `DrawerDetalleComponent` (Req 39.2)
 * con los campos enmascarados —referencia, cliente, producto, estado,
 * canon o pago, fecha y comisión (Req 34.1, 34.5)— junto con un
 * `TimelineComponent` con los hitos del trámite (Req 34.2).
 *
 * Al pulsar "Cerrar" o el control de cierre del drawer, oculta el detalle y
 * emite `cerrar` para que el contenedor regrese a la tabla (Req 34.3).
 *
 * Standalone + `inject()`; los datos llegan enmascarados desde el backend y el
 * componente no persiste PII ni deriva cálculos autoritativos en el cliente.
 */
@Component({
  selector: 'app-detalle-solicitud',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DrawerDetalleComponent, TimelineComponent],
  templateUrl: './detalle-solicitud.component.html',
  styleUrl: './detalle-solicitud.component.scss',
})
export class DetalleSolicitudComponent implements OnChanges {
  private readonly dashboardService = inject(DashboardService);

  /** Referencia de la solicitud seleccionada; `null` mantiene el drawer cerrado. */
  @Input() referencia: string | null = null;

  /** Emite cuando el usuario cierra el detalle y se regresa a la tabla (Req 34.3). */
  @Output() cerrar = new EventEmitter<void>();

  /** Controla la visibilidad del drawer (Req 34.1, 34.3). */
  protected readonly abierto = signal(false);

  /** Indica que se está obteniendo el detalle desde el backend (Req 34.4). */
  protected readonly cargando = signal(false);

  /** Mensaje genérico de error si falla la consulta del detalle. */
  protected readonly error = signal<string | null>(null);

  /** Filas etiqueta/valor a mostrar en el cuerpo del drawer (Req 34.1). */
  protected readonly filas = signal<readonly FilaDetalle[]>([]);

  /** Hitos del trámite mostrados en la línea de tiempo (Req 34.2). */
  protected readonly hitos = signal<readonly HitoTimeline[]>([]);

  /**
   * Reacciona al cambio de referencia: abre y carga el detalle cuando hay una
   * referencia válida; en caso contrario mantiene el drawer cerrado.
   * @param cambios cambios de las propiedades de entrada.
   */
  ngOnChanges(cambios: SimpleChanges): void {
    if (!('referencia' in cambios)) {
      return;
    }
    const referencia = this.referencia?.trim();
    if (referencia) {
      this.abrirDetalle(referencia);
    } else {
      this.reiniciar();
    }
  }

  /** Solicita el cierre del detalle y notifica al contenedor (Req 34.3). */
  protected onCerrar(): void {
    this.reiniciar();
    this.cerrar.emit();
  }

  /**
   * Obtiene el Detalle_Solicitud desde el backend y prepara la vista (Req 34.4).
   * @param referencia identificador de la solicitud seleccionada.
   */
  private abrirDetalle(referencia: string): void {
    this.abierto.set(true);
    this.cargando.set(true);
    this.error.set(null);
    this.dashboardService
      .obtenerDetalleSolicitud(referencia)
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (detalle) => this.aplicarDetalle(detalle),
        error: () =>
          this.error.set('No fue posible cargar el detalle de la solicitud.'),
      });
  }

  /**
   * Mapea el detalle recibido (enmascarado) a filas de presentación e hitos.
   * @param detalle detalle de la solicitud con su línea de tiempo.
   */
  private aplicarDetalle(detalle: DetalleSolicitud): void {
    this.filas.set(construirFilasDetalle(detalle));
    this.hitos.set(detalle.timeline);
  }

  /** Restablece el estado interno al cerrar el detalle. */
  private reiniciar(): void {
    this.abierto.set(false);
    this.cargando.set(false);
    this.error.set(null);
    this.filas.set([]);
    this.hitos.set([]);
  }
}

/** Etiquetas de los campos del Detalle_Solicitud en el orden del prototipo (Req 34.1). */
const ETIQUETAS_DETALLE = {
  referencia: 'Referencia',
  cliente: 'Cliente',
  producto: 'Producto',
  estado: 'Estado',
  estadoPago: 'Canon / Pago',
  fecha: 'Fecha',
  comision: 'Comisión',
} as const;

/**
 * Construye las filas etiqueta/valor del Detalle_Solicitud a partir del detalle
 * enmascarado recibido del backend (Req 34.1, 34.5). Función pura y total.
 *
 * @param detalle detalle de la solicitud (PII ya enmascarada por el backend).
 * @returns filas de presentación en el orden definido por el prototipo.
 */
export function construirFilasDetalle(
  detalle: DetalleSolicitud,
): readonly FilaDetalle[] {
  return [
    { etiqueta: ETIQUETAS_DETALLE.referencia, valor: detalle.referencia },
    { etiqueta: ETIQUETAS_DETALLE.cliente, valor: detalle.cliente },
    { etiqueta: ETIQUETAS_DETALLE.producto, valor: detalle.producto },
    { etiqueta: ETIQUETAS_DETALLE.estado, valor: etiquetaEstado(detalle.estado) },
    { etiqueta: ETIQUETAS_DETALLE.estadoPago, valor: detalle.estadoPago },
    { etiqueta: ETIQUETAS_DETALLE.fecha, valor: detalle.fecha },
    { etiqueta: ETIQUETAS_DETALLE.comision, valor: formatearComision(detalle.comision) },
  ];
}

/** Etiquetas legibles de estado para la vista de detalle (Req 34.1). */
const ETIQUETAS_ESTADO: Readonly<Record<string, string>> = {
  radicada: 'Radicada',
  en_revision: 'En revisión',
  aprobada: 'Aprobada',
  bloqueada: 'Bloqueada',
  observada: 'Observada',
};

/**
 * Devuelve la etiqueta legible de un estado de solicitud.
 * @param estado estado de la solicitud.
 * @returns etiqueta legible; el propio estado si no tiene mapeo.
 */
function etiquetaEstado(estado: string): string {
  return ETIQUETAS_ESTADO[estado] ?? estado;
}

/**
 * Formatea el valor de comisión como moneda colombiana para su presentación.
 * @param comision valor numérico de la comisión.
 * @returns cadena formateada en pesos colombianos.
 */
function formatearComision(comision: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(comision);
}
