import { pesos } from '../../../core/util/numeros-letras';
import { fechaCorta } from '../../../core/services/admin.helpers';
import { CatalogoService } from '../../../core/services/catalogo.service';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  computed,
  inject,
  signal,
} from '@angular/core';
import { catchError, finalize, of } from 'rxjs';

import { DashboardService } from '../../../core/services/dashboard.service';
import { RadicacionService, type ProcedimientoResponse } from '../../../core/services/radicacion.service';
import { BitacoraComponent, type EventoBitacora } from '../../../shared/components/bitacora/bitacora.component';
import {
  DetalleSolicitud,
  DocumentoSolicitud,
  HitoTimeline,
  PersonaNegocio,
} from '../../../core/models/solicitud.model';
import type { FilaDetalle } from '../../../shared/components/drawer-detalle/drawer-detalle.component';
import { TimelineComponent } from '../../../shared/components/timeline/timeline.component';
import { BotonComponent } from '../../../shared/components/boton/boton.component';
import { ModalDialogComponent } from '../../../shared/components/modal-dialog/modal-dialog.component';
import { FichaComponent, type SeccionFicha } from '../../../shared/components/ficha/ficha.component';
import { BadgeEstadoComponent } from '../../../shared/components/badge-estado/badge-estado.component';
import { AlertBannerComponent } from '../../../shared/components/alert-banner/alert-banner.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { CorreccionPanelComponent } from '../../correccion/components/correccion-panel/correccion-panel.component';
import { VisorArchivoComponent } from '../../../shared/components/visor-archivo/visor-archivo.component';

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
  imports: [CorreccionPanelComponent, VisorArchivoComponent, BitacoraComponent, ModalDialogComponent, FichaComponent, BadgeEstadoComponent, AlertBannerComponent, IconComponent, TimelineComponent, BotonComponent],
  templateUrl: './detalle-solicitud.component.html',
  styleUrl: './detalle-solicitud.component.scss',
})
export class DetalleSolicitudComponent implements OnChanges {
  private readonly dashboardService = inject(DashboardService);
  private readonly catalogo = inject(CatalogoService);
  private readonly radicacion = inject(RadicacionService);

  /** Procedimiento real del área (Warehouse): estado, qué corregir, póliza y bitácora. */
  protected readonly procedimiento = signal<ProcedimientoResponse | null>(null);
  protected readonly bitacora = signal<readonly EventoBitacora[]>([]);

  /** Documentos de la radicación (cotización, contrato, CTL y cargados) y el que se está viendo. */
  protected readonly documentos = signal<readonly DocumentoSolicitud[]>([]);
  protected readonly documentoActivo = signal<DocumentoSolicitud | null>(null);
  protected readonly archivoActivo = signal<Blob | null>(null);
  protected readonly cargandoArchivo = signal(false);

  /** Los generados por el portal (cotización y contrato) van aparte de lo que cargó el broker (CTL y demás). */
  protected readonly gruposDocumentos = computed(() => {
    const docs = this.documentos();
    const esGenerado = (d: DocumentoSolicitud) => d.tipo === 'cotizacion' || d.tipo === 'contrato' || d.tipo === 'cuenta_cobro';
    const generados = docs.filter(esGenerado);
    const cargados = docs.filter((d) => !esGenerado(d));
    return [
      { titulo: 'Generados', items: generados },
      { titulo: 'Cargados', items: cargados },
    ].filter((g) => g.items.length > 0);
  });

  protected iconoDocumento(d: DocumentoSolicitud): string {
    return d.tipo === 'cotizacion' ? 'request_quote' : d.tipo === 'contrato' ? 'description' : d.tipo === 'cuenta_cobro' ? 'receipt_long' : d.tipo === 'ctl' ? 'verified_user' : 'attach_file';
  }
  protected readonly errorArchivo = signal(false);

  /** Referencia de la solicitud seleccionada; `null` mantiene el drawer cerrado. */
  @Input() referencia: string | null = null;

  /** Emite cuando el usuario cierra el detalle y se regresa a la tabla (Req 34.3). */
  @Output() cerrar = new EventEmitter<void>();

  /** La solicitud cambió de estado desde el detalle (p. ej. se envió la corrección): la tabla debe recargarse. */
  @Output() actualizado = new EventEmitter<void>();

  /** La corrección se gestiona dentro del modal: este indicador alterna entre la gestión y el detalle. */
  protected readonly modoCorreccion = signal(false);
  private correccionOfrecida = false;

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
  /** La ficha ya trae la póliza expedida: el aviso verde sobraría. */
  protected readonly polizaEnFicha = computed(() => this.secciones().some((s) => s.titulo === 'Póliza expedida'));
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
  protected readonly pendienteEnvio = signal(false);

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
    this.dashboardService
      .obtenerDocumentosSolicitud(referencia)
      .pipe(catchError(() => of([] as readonly DocumentoSolicitud[])))
      .subscribe((docs) => this.documentos.set(docs));
    this.cargando.set(true);
    this.error.set(null);
    this.dashboardService
      .obtenerDetalleSolicitud(referencia)
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (detalle) => this.aplicarDetalle(detalle),
        error: () =>
          this.error.set('No pudimos cargar el detalle de la solicitud.'),
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
    this.puedeCorregir.set(detalle.estado === 'observada' || detalle.estado === 'radicada');
    // Si el procedimiento del área ya llegó, su estado prevalece sobre el del resumen.
    if (this.procedimiento()) this.aplicarProcedimiento(this.procedimiento());
  }

  /** Abre la gestión de corrección dentro del mismo modal (el backend revalida la propiedad del trámite). */
  protected gestionarCorreccion(): void {
    this.modoCorreccion.set(true);
  }

  /** Se enviaron los documentos: el estado del área cambió y la tabla de Seguimiento debe recargarse. */
  protected onCorreccionEnviada(p: ProcedimientoResponse): void {
    this.aplicarProcedimiento(p);
    this.actualizado.emit();
  }

  /** Cierra el mensaje de éxito y deja el detalle ya actualizado. */
  protected onCorreccionTerminada(): void {
    this.modoCorreccion.set(false);
  }
  /** Muestra un documento de la radicación en la vista previa; un fallo no cierra el detalle. */
  protected verDocumento(documento: DocumentoSolicitud): void {
    const referencia = this.referenciaCargada() ?? this.referencia;
    if (!referencia) {
      return;
    }
    this.documentoActivo.set(documento);
    this.archivoActivo.set(null);
    this.errorArchivo.set(false);
    this.cargandoArchivo.set(true);
    this.dashboardService
      .descargarDocumentoSolicitud(referencia, documento)
      .pipe(finalize(() => this.cargandoArchivo.set(false)))
      .subscribe({
        next: (blob) => this.archivoActivo.set(blob),
        error: () => this.errorArchivo.set(true),
      });
  }

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
    // También la radicación creada que no alcanzó a enviarse: se completa desde la misma pantalla.
    this.puedeCorregir.set(['EN_CORRECCION', 'RADICADA'].includes(p.procedimiento.estadoPortal));
    this.pendienteEnvio.set(p.procedimiento.estadoPortal === 'RADICADA');
    // «Gestionar» abre directo la corrección; si el broker prefiere ver el detalle, no se le vuelve a imponer.
    if (this.puedeCorregir() && !this.correccionOfrecida) {
      this.correccionOfrecida = true;
      this.modoCorreccion.set(true);
    }
  }

  private reiniciar(): void {
    this.modoCorreccion.set(false);
    this.correccionOfrecida = false;
    this.documentos.set([]);
    this.documentoActivo.set(null);
    this.archivoActivo.set(null);
    this.errorArchivo.set(false);
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
  cliente: 'Propietario',
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
    { etiqueta: ETIQUETAS_DETALLE.fecha, valor: fechaCorta(detalle.fecha) },
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
  return pesos(comision);
}

/**
 * Comisión real si ya se causó; si no, la estimada (auditoría de producción PB5). La condición («se causa al expedir»)
 * va en la descripción de la sección, no junto a la cifra.
 */
function comisionVisible(detalle: DetalleSolicitud): { etiqueta: string; valor: string } {
  if (detalle.comision > 0) return { etiqueta: 'Tu comisión', valor: pesos(detalle.comision) };
  return detalle.comisionEstimada
    ? { etiqueta: 'Tu comisión estimada', valor: pesos(detalle.comisionEstimada) }
    : { etiqueta: 'Tu comisión', valor: pesos(0) };
}

/** Secciones de la ficha del negocio que ve el broker (lenguaje de póliza de arrendamiento). */
export function construirSecciones(
  detalle: DetalleSolicitud,
  etiquetaEstado: (estado: string) => string = (estado) => estado,
): readonly SeccionFicha[] {
  const p = detalle.partes;
  const documento = (x: PersonaNegocio | null | undefined) =>
    x?.documento ? [x.tipoDocumento, x.documento].filter(Boolean).join(' ') : null;
  const propietario = p?.propietario;
  const inquilino = p?.inquilino;
  return [
    // La póliza expedida va primero: es lo que el broker viene a buscar.
    ...(p?.numeroPoliza
      ? [{
          titulo: 'Póliza expedida',
          icono: 'verified',
          datos: [
            { etiqueta: 'Número de póliza', valor: p.numeroPoliza, destacado: true },
            { etiqueta: 'Prima total', valor: p.primaTotal ? pesos(p.primaTotal) : null },
            { etiqueta: 'Inicio de vigencia', valor: p.inicioVigencia ? fechaCorta(p.inicioVigencia) : null },
            { etiqueta: 'Fin de vigencia', valor: p.finVigencia ? fechaCorta(p.finVigencia) : null },
          ],
        }]
      : []),
    {
      titulo: 'Solicitud de póliza',
      icono: 'description',
      descripcion: 'Lo que radicaste para asegurar el arrendamiento',
      datos: [
        { etiqueta: 'Referencia', valor: detalle.referencia },
        { etiqueta: 'Producto', valor: detalle.producto },
        { etiqueta: 'Fecha de radicación', valor: fechaCorta(detalle.fecha) },
        { etiqueta: 'Estado', valor: etiquetaEstado(detalle.estado) },
      ],
    },
    {
      titulo: 'Propietario · tomador',
      icono: 'home_work',
      datos: [
        { etiqueta: 'Nombre', valor: propietario?.nombre ?? detalle.cliente },
        { etiqueta: 'Documento', valor: documento(propietario) },
        { etiqueta: 'Teléfono', valor: propietario?.telefono ?? null },
        { etiqueta: 'Correo', valor: propietario?.correo ?? null },
        { etiqueta: 'Dirección de residencia', valor: propietario?.direccion ?? null, ancho: true },
      ],
    },
    ...(inquilino?.nombre
      ? [{
          titulo: 'Inquilino · arrendatario',
          icono: 'person',
          datos: [
            { etiqueta: 'Nombre', valor: inquilino.nombre },
            { etiqueta: 'Documento', valor: documento(inquilino) },
            { etiqueta: 'Teléfono', valor: inquilino.telefono },
            { etiqueta: 'Correo', valor: inquilino.correo },
          ],
        }]
      : []),
    ...(p?.inmueble
      ? [{
          titulo: 'Inmueble asegurado',
          icono: 'apartment',
          datos: [
            { etiqueta: 'Dirección', valor: p.inmueble, ancho: true },
            { etiqueta: 'Ciudad', valor: p.ciudad },
          ],
        }]
      : []),
    {
      titulo: 'Valores y comisión',
      icono: 'payments',
      descripcion: 'Tu comisión se causa cuando se expide la póliza',
      datos: [
        // Canon y pago son dos datos distintos (auditoría de producción PB4).
        { etiqueta: 'Canon mensual', valor: detalle.canon ? pesos(detalle.canon) : '—' },
        { etiqueta: 'Pago de la póliza', valor: detalle.estadoPago },
        { ...comisionVisible(detalle), destacado: true },
      ],
    },
  ];
}
