import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CatalogoService } from '../../../core/services/catalogo.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Observable } from 'rxjs';

import type { BrokerConsola, ComercialConsola, Movimiento } from '../../../core/models/consola.model';
import { AdminService } from '../../../core/services/admin.service';
import { COLUMNA_GESTIONAR, COLUMNAS_FECHAS, celdasFechas, cop, copCompacto } from '../../../core/services/admin.helpers';
import { ConsolaService } from '../../../core/services/consola.service';
import { mensajeErrorIntegracion } from '../../../core/util/errores-integracion';
import {
  BadgeEstadoComponent,
  BitacoraComponent,
  BotonComponent,
  DataTableComponent,
  EstadoVistaComponent,
  FichaComponent,
  FormFieldComponent,
  GridLayoutComponent,
  KpiCardComponent,
  ModalDialogComponent,
  PageHeaderComponent,
  SegmentedControlComponent,
} from '../../../shared/components';
import type { AccionFila, ColumnaTabla, FilaTabla, OpcionSegmentada, SeccionFicha, Tab } from '../../../shared/components';
import { FeedbackService } from '../../../shared/services/feedback/feedback.service';

/**
 * Brokers REGISTRADOS y activos (los prospectos viven en su propia vista). Un botón por fila abre el
 * modal de operación: detalle completo, acuerdo de comisión, reasignación de comercial (arrastra sus
 * negocios) y actividad. Comercial: solo su cartera y solo lectura.
 */
@Component({
  selector: 'app-admin-brokers',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeEstadoComponent,
    BitacoraComponent,
    BotonComponent,
    DataTableComponent,
    EstadoVistaComponent,
    FichaComponent,
    FormFieldComponent,
    GridLayoutComponent,
    KpiCardComponent,
    ModalDialogComponent,
    PageHeaderComponent,
    SegmentedControlComponent,
  ],
  templateUrl: './brokers.component.html',
  styleUrls: ['../admin-comun.scss'],
})
export class BrokersComponent {
  private readonly feedback = inject(FeedbackService);
  private readonly admin = inject(AdminService);
  private readonly consola = inject(ConsolaService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly esAdmin = this.admin.esAdmin();
  protected readonly compacto = copCompacto;

  protected readonly brokers = signal<readonly BrokerConsola[]>([]);
  protected readonly comerciales = signal<readonly ComercialConsola[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal(false);

  protected readonly columnas: readonly ColumnaTabla[] = [
    { key: 'broker', header: 'Broker', tipo: 'principal', ordenable: true },
    { key: 'contacto', header: 'Contacto', tipo: 'principal' },
    { key: 'comercial', header: 'Comercial', ordenable: true },
    { key: 'acuerdo', header: 'Acuerdo', alinear: 'derecha' },
    { key: 'negocios', header: 'Negocios', alinear: 'derecha', ordenable: true },
    { key: 'ingreso', header: 'Ingreso', alinear: 'derecha', ordenable: true },
    { key: 'comision', header: 'Comisión pagada / cobrada', alinear: 'derecha' },
    ...COLUMNAS_FECHAS,
    COLUMNA_GESTIONAR,
  ];

  protected readonly filas = computed<readonly FilaTabla[]>(() =>
    this.brokers().map((b) => ({
      broker: b.nombre,
      brokerSub: `${b.tipo} · ${b.documento ?? 'sin documento'}`,
      contacto: b.correo ?? '—',
      contactoSub: b.celular ?? '',
      comercial: b.comercialNombre ?? 'Sin asignar',
      acuerdo: `${b.porcentajeComision} %`,
      negocios: `${b.negocios} · ${b.polizas} pólizas`,
      negociosOrden: b.negocios,
      ingreso: cop(b.primas),
      ingresoOrden: b.primas,
      comision: `${cop(b.comisionPagada)} / ${cop(b.comisionCobrada)}`,
      ...celdasFechas(b.creado, b.ultimoMovimiento),
      gestionar: '',
    })),
  );

  protected readonly totalIngreso = computed(() => this.brokers().reduce((t, b) => t + b.primas, 0));
  protected readonly totalPendiente = computed(() =>
    this.brokers().reduce((t, b) => t + Math.max(0, b.comisionCobrada - b.comisionPagada), 0),
  );

  // --- Modal de operación ---
  protected readonly seleccionado = signal<BrokerConsola | null>(null);
  protected readonly pestana = signal('detalle');
  protected readonly pestanas = computed<readonly Tab[]>(() => [
    { id: 'detalle', etiqueta: 'Detalle' },
    ...(this.esAdmin ? [{ id: 'acciones', etiqueta: 'Acciones' }] : []),
    { id: 'actividad', etiqueta: 'Actividad' },
  ]);
  protected readonly actividad = signal<readonly Movimiento[]>([]);
  protected readonly acuerdo = signal('20');
  protected readonly comercialDestino = signal('');
  protected readonly guardando = signal(false);
  /** Acuerdos de comisión (catálogo `acuerdo_comision`). */
  protected readonly opcionesAcuerdo: readonly OpcionSegmentada[] = inject(CatalogoService)
    .opciones('acuerdo_comision')
    .map((a) => ({ valor: a.codigo, etiqueta: a.descripcion }));

  protected readonly ficha = computed<readonly SeccionFicha[]>(() => {
    const b = this.seleccionado();
    if (!b) return [];
    return [
      {
        titulo: 'Datos del broker',
        icono: 'badge',
        datos: [
          { etiqueta: 'Nombre', valor: b.nombre },
          { etiqueta: 'Tipo', valor: b.tipo },
          { etiqueta: 'Documento', valor: b.documento },
          { etiqueta: 'Correo', valor: b.correo },
          { etiqueta: 'Celular', valor: b.celular },
          { etiqueta: 'Comercial', valor: b.comercialNombre ?? 'Sin asignar' },
          { etiqueta: 'Acuerdo de comisión', valor: `${b.porcentajeComision} % sobre el valor sin IVA` },
        ],
      },
      {
        titulo: 'Producción asegurada',
        icono: 'trending_up',
        datos: [
          { etiqueta: 'Negocios radicados', valor: b.negocios },
          { etiqueta: 'Pólizas expedidas', valor: b.polizas },
          { etiqueta: 'Ingreso al negocio', valor: cop(b.primas) },
          { etiqueta: 'Comisión cobrada', valor: cop(b.comisionCobrada), destacado: true },
          { etiqueta: 'Comisión pagada', valor: cop(b.comisionPagada) },
          { etiqueta: 'Pendiente de pago', valor: cop(Math.max(0, b.comisionCobrada - b.comisionPagada)) },
        ],
      },
      {
        titulo: 'Trazabilidad',
        icono: 'event',
        datos: [
          { etiqueta: 'Creado', valor: celdasFechas(b.creado, b.ultimoMovimiento).creado },
          { etiqueta: 'Último movimiento', valor: celdasFechas(b.creado, b.ultimoMovimiento).ultimoMovimiento },
        ],
      },
    ];
  });

  constructor() {
    this.cargar();
    if (this.esAdmin) {
      this.consola
        .comerciales()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (c) => this.comerciales.set(c.filter((x) => x.activo)), error: () => this.comerciales.set([]) });
    }
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.consola
      .brokers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (b) => {
          this.brokers.set(b);
          this.cargando.set(false);
        },
        error: () => {
          this.brokers.set([]);
          this.cargando.set(false);
          this.error.set(true);
        },
      });
  }

  protected gestionar(evento: AccionFila): void {
    const b = this.brokers().at(evento.indice);
    if (!b) return;
    this.seleccionado.set(b);
    this.pestana.set('detalle');
    this.acuerdo.set(String(b.porcentajeComision));
    this.comercialDestino.set('');
    this.actividad.set([]);
    this.consola
      .actividadBroker(b.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (a) => this.actividad.set(a), error: () => this.actividad.set([]) });
  }

  protected valor(evento: Event): string {
    return (evento.target as HTMLSelectElement).value;
  }

  protected guardarAcuerdo(): void {
    const b = this.seleccionado();
    if (!b) return;
    this.ejecutar(this.admin.cambiarComision(b.id, Number(this.acuerdo())),
      `Acuerdo de ${b.nombre} actualizado al ${this.acuerdo()} %.`);
  }

  protected reasignar(): void {
    const b = this.seleccionado();
    if (!b || !this.comercialDestino()) return;
    const destino = this.comerciales().find((c) => c.codigo === this.comercialDestino());
    this.ejecutar(this.admin.asignarComercial(b.id, this.comercialDestino()),
      `${b.nombre} y todos sus negocios pasaron a ${destino?.nombre ?? this.comercialDestino()}.`);
  }

  private ejecutar(accion: Observable<unknown>, exito: string): void {
    this.guardando.set(true);
    accion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.guardando.set(false);
        this.seleccionado.set(null);
        this.feedback.toast({ variante: 'exito', mensaje: exito });
        this.cargar();
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        this.feedback.toast({ variante: 'error', mensaje: mensajeErrorIntegracion(err) });
      },
    });
  }
}
