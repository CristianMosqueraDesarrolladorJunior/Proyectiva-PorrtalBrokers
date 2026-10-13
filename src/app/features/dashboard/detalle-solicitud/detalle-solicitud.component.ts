import { CatalogoService } from '../../../core/services/catalogo.service';
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
import { Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';

import { DashboardService } from '../../../core/services/dashboard.service';
import { RadicacionService, type ProcedimientoResponse } from '../../../core/services/radicacion.service';
import { BitacoraComponent, type EventoBitacora } from '../../../shared/components/bitacora/bitacora.component';
import {
  DetalleSolicitud,
  HitoTimeline,
} from '../../../core/models/solicitud.model';
import type { FilaDetalle } from '../../../shared/components/drawer-detalle/drawer-detalle.component';
import { TimelineComponent } from '../../../shared/components/timeline/timeline.component';
import { BotonComponent } from '../../../shared/components/boton/boton.component';
import { ModalDialogComponent } from '../../../shared/components/modal-dialog/modal-dialog.component';
import { FichaComponent, type SeccionFicha } from '../../../shared/components/ficha/ficha.component';
import { BadgeEstadoComponent } from '../../../shared/components/badge-estado/badge-estado.component';
import { AlertBannerComponent } from '../../../shared/components/alert-banner/alert-banner.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/**
 * DetalleSolicitudComponent — Detalle_Solicitud del Seguimiento (Req 34).
 *
 * Al recibir la `referencia` de la fila seleccionada en la tabla de Seguimiento
 * (Req 6.4), obtiene el Detalle_Solicitud desde el API_Backend mediante
 * `DashboardService`/`HttpClient` (`GET /api/v1/solicitudes/{referencia}`,
 * Req 34.4) y lo presenta reutilizando el `DrawerDetalleComponent` (Req 39.2)
 * con los datos completos —referencia, cliente, producto, estado,
 * canon o pago, fecha y comisión (Req 34.1, 34.5)— junto con un
 * `TimelineComponent` con los hitos del trámite (Req 34.2).
 *
 * Al pulsar "Cerrar" o el control de cierre del drawer, oculta el detalle y
 * emite `cerrar` para que el contenedor regrese a la tabla (Req 34.3).
 *
 * Standalone + `inject()`; los datos llegan completos desde el backend y el
 * componente no persiste PII ni deriva cálculos autoritativos en el cliente.
 */
@Component({
  selector: 'app-detalle-solicitud',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BitacoraComponent, ModalDialogComponent, FichaComponent, BadgeEstadoComponent, AlertBannerComponent, IconComponent, TimelineComponent, BotonComponent],
  templateUrl: './detalle-solicitud.component.html',
  styleUrl: './detalle-solicitud.component.scss',
})
export class DetalleSolicitudComponent implements OnChanges {
  private readonly dashboardService = inject(DashboardService);
  private readonly catalogo = inject(CatalogoService);
  private readonly router = inject(Router);
  private readonly radicacion = inject(RadicacionService);

  /** Procedimiento real del área (Warehouse): estado, qué corregir, póliza y bitácora. */
  protected readonly procedimiento = signal<ProcedimientoResponse | null>(null);
  protected readonly bitacora = signal<readonly EventoBitacora[]>([]);

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

  /** Detalle presentado en secciones colapsables (mismo componente de ficha de la consola). */
  protected readonly secciones = signal<readonly SeccionFicha[]>([]);
  protected readonly referenciaVista = signal('');
  protected readonly etiquetaEstado = signal('');
  protected readonly varianteEstado = signal<'success' | 'warning' | 'danger' | 'info'>('info');

  /**
   * Estado actual de la solicitud cargada. Se usa para habilitar la gestión de corrección de
   * documentos cuando la solicitud está "observada" (requiere actualización documental).
   */
  protected readonly estadoActual = signal<string | null>(null);

  /** Referencia de la solicitud cargada (para enrutar a la corrección de documentos). */
  private readonly referenciaCargada = signal<string | null>(null);

  /**
   * Indica si la solicitud permite gestionar una corrección de documentos desde el detalle. Aplica
   * cuando el estado es "observada": la revisión solicitó actualizar/corregir los documentos.
   */
  protected readonly puedeCorregir = signal(false);

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
    this.radicacion
      .procedimiento(referencia)
      .pipe(catchError(() => of(null)))
      .subscribe((p) => this.aplicarProcedimiento(p));
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
   * Mapea el detalle recibido a filas de presentación e hitos.
   * @param detalle detalle de la solicitud con su línea de tiempo.
   */
  private aplicarDetalle(detalle: DetalleSolicitud): void {
    this.filas.set(construirFilasDetalle(detalle, (e) => this.catalogo.etiquetaSeguimiento(e)));
    this.secciones.set(construirSecciones(detalle, (e) => this.catalogo.etiquetaSeguimiento(e)));
    this.referenciaVista.set(detalle.referencia);
    this.etiquetaEstado.set(this.catalogo.etiquetaSeguimiento(detalle.estado));
    this.varianteEstado.set(VARIANTE_ESTADO[detalle.estado] ?? 'info');
    this.hitos.set(detalle.timeline);
    this.estadoActual.set(detalle.estado);
    this.referenciaCargada.set(detalle.referencia);
    // "observada" = la revisión solicitó actualizar/corregir documentos (gestión de corrección).
    this.puedeCorregir.set(detalle.estado === 'observada');
    // Si el procedimiento del área ya llegó, su estado prevalece sobre el del resumen.
    if (this.procedimiento()) this.aplicarProcedimiento(this.procedimiento());
  }

  /**
   * Inicia la gestión de corrección de documentos del trámite observado (Req 32). Navega al flujo
   * de corrección pasando la referencia como query param para precargar el trámite; el backend
   * revalida la propiedad del trámite (anti-BOLA) antes de registrar la corrección.
   */
  protected gestionarCorreccion(): void {
    const referencia = this.referenciaCargada();
    if (!referencia) {
      return;
    }
    void this.router.navigate(['/app/correccion'], {
      queryParams: { referencia },
    });
  }

  /** Restablece el estado interno al cerrar el detalle. */
  /** El estado del área manda: la corrección se habilita solo si el Warehouse la pidió. */
  private aplicarProcedimiento(p: ProcedimientoResponse | null): void {
    this.procedimiento.set(p);
    this.bitacora.set(
      (p?.eventos ?? []).map((e) => ({ fecha: e.fecha, tipo: 'Gestión', descripcion: e.descripcion })),
    );
    if (!p) return;
    this.etiquetaEstado.set(p.procedimiento.etiqueta);
    this.varianteEstado.set(
      p.procedimiento.estadoPortal === 'EXPEDIDA' ? 'success'
        : p.procedimiento.estadoPortal === 'EN_CORRECCION' ? 'warning'
        : p.procedimiento.estadoPortal === 'ANULADA' ? 'danger' : 'info',
    );
    this.puedeCorregir.set(p.procedimiento.estadoPortal === 'EN_CORRECCION');
  }

  private reiniciar(): void {
    this.procedimiento.set(null);
    this.bitacora.set([]);
    this.abierto.set(false);
    this.cargando.set(false);
    this.error.set(null);
    this.filas.set([]);
    this.secciones.set([]);
    this.referenciaVista.set('');
    this.hitos.set([]);
    this.estadoActual.set(null);
    this.referenciaCargada.set(null);
    this.puedeCorregir.set(false);
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
 * recibido del backend (Req 34.1, 34.5). Función pura y total.
 *
 * @param detalle detalle de la solicitud (datos completos).
 * @returns filas de presentación en el orden definido por el prototipo.
 */
export function construirFilasDetalle(
  detalle: DetalleSolicitud,
  etiquetaEstado: (estado: string) => string = (estado) => estado,
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

const VARIANTE_ESTADO: Readonly<Record<string, 'success' | 'warning' | 'danger' | 'info'>> = {
  aprobada: 'success',
  observada: 'warning',
  bloqueada: 'danger',
};

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

/** Secciones de la ficha del negocio que ve el broker (lenguaje de póliza de arrendamiento). */
export function construirSecciones(
  detalle: DetalleSolicitud,
  etiquetaEstado: (estado: string) => string = (estado) => estado,
): readonly SeccionFicha[] {
  return [
    {
      titulo: 'Solicitud de póliza',
      icono: 'description',
      descripcion: 'Lo que radicaste para asegurar el arrendamiento',
      datos: [
        { etiqueta: 'Referencia', valor: detalle.referencia },
        { etiqueta: 'Producto', valor: detalle.producto },
        { etiqueta: 'Fecha de radicación', valor: detalle.fecha },
        { etiqueta: 'Estado', valor: etiquetaEstado(detalle.estado) },
      ],
    },
    {
      titulo: 'Tomador del negocio',
      icono: 'person',
      datos: [{ etiqueta: 'Cliente', valor: detalle.cliente, ancho: true }],
    },
    {
      titulo: 'Valores y comisión',
      icono: 'payments',
      descripcion: 'Tu comisión se causa cuando se expide la póliza',
      datos: [
        { etiqueta: 'Canon / pago de la póliza', valor: detalle.estadoPago },
        { etiqueta: 'Tu comisión', valor: formatearComision(detalle.comision), destacado: true },
      ],
    },
  ];
}
