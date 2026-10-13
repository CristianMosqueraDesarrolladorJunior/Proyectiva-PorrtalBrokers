import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CatalogoService } from '../../../core/services/catalogo.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import type { CuentaCobroResponse } from '../../../core/models/comisiones.model';
import { AdminService } from '../../../core/services/admin.service';
import { COLUMNA_GESTIONAR, COLUMNAS_FECHAS, celdasFechas, cop, copCompacto, fechaCorta, fechaHora } from '../../../core/services/admin.helpers';
import { ComisionesService } from '../../../core/services/comisiones.service';
import { ConsolaService } from '../../../core/services/consola.service';
import { mensajeErrorIntegracion } from '../../../core/util/errores-integracion';
import {
  AlertBannerComponent,
  BadgeEstadoComponent,
  BarraAccionesComponent,
  BotonComponent,
  DataTableComponent,
  EstadoVistaComponent,
  FichaComponent,
  FormFieldComponent,
  GridLayoutComponent,
  KpiCardComponent,
  ModalDialogComponent,
  MoneyInputComponent,
  PageHeaderComponent,
  SegmentedControlComponent,
  VisorArchivoComponent,
} from '../../../shared/components';
import type { AccionFila, ColumnaTabla, FilaTabla, OpcionSegmentada, SeccionFicha, Tab, VarianteBadge } from '../../../shared/components';

/** Color de la insignia por estado de pago (presentación; la etiqueta sale del catálogo `estado_pago_comision`). */
const VARIANTE_PAGO: Readonly<Partial<Record<string, VarianteBadge>>> = {
  pendiente: 'warning',
  pagada: 'success',
  rechazada: 'danger',
};

/**
 * Comisiones: cuentas de cobro de los brokers y su control de pago (qué se pagó y qué está
 * pendiente). Administrador registra pagos y rechazos; Comercial ve las de sus brokers.
 */
@Component({
  selector: 'app-admin-comisiones',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AlertBannerComponent,
    BadgeEstadoComponent,
    BarraAccionesComponent,
    BotonComponent,
    DataTableComponent,
    EstadoVistaComponent,
    FichaComponent,
    FormFieldComponent,
    GridLayoutComponent,
    KpiCardComponent,
    ModalDialogComponent,
    MoneyInputComponent,
    PageHeaderComponent,
    SegmentedControlComponent,
    VisorArchivoComponent,
  ],
  templateUrl: './comisiones-admin.component.html',
  styleUrls: ['../admin-comun.scss'],
})
export class ComisionesAdminComponent {
  private readonly admin = inject(AdminService);
  private readonly consola = inject(ConsolaService);
  private readonly comisiones = inject(ComisionesService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly esAdmin = this.admin.esAdmin();
  protected readonly compacto = copCompacto;
  protected readonly pago = inject(CatalogoService).insignias('estado_pago_comision', VARIANTE_PAGO, 'info' as VarianteBadge);

  protected readonly cuentas = signal<readonly CuentaCobroResponse[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal(false);
  protected readonly mensaje = signal('');

  protected readonly filtros: readonly OpcionSegmentada[] = [
    { valor: 'pendiente', etiqueta: 'Pendientes' },
    { valor: 'pagada', etiqueta: 'Pagadas' },
    { valor: 'rechazada', etiqueta: 'Rechazadas' },
    { valor: '', etiqueta: 'Todas' },
  ];
  protected readonly filtro = signal('pendiente');

  protected readonly columnas: readonly ColumnaTabla[] = [
    { key: 'cuenta', header: 'Cuenta de cobro', tipo: 'principal', ordenable: true },
    { key: 'broker', header: 'Broker', tipo: 'principal', ordenable: true },
    { key: 'polizas', header: 'Pólizas', alinear: 'derecha' },
    { key: 'valor', header: 'Valor pagado por propietarios', alinear: 'derecha', ordenable: true },
    { key: 'comision', header: 'A cobrar', alinear: 'derecha', ordenable: true },
    { key: 'estado', header: 'Pago', tipo: 'badge', ordenable: true },
    { key: 'pagado', header: 'Pagado', tipo: 'principal' },
    ...COLUMNAS_FECHAS,
    COLUMNA_GESTIONAR,
  ];

  protected readonly visibles = computed(() =>
    this.filtro() ? this.cuentas().filter((c) => (c.estadoPago ?? 'pendiente') === this.filtro()) : this.cuentas(),
  );

  protected readonly filas = computed<readonly FilaTabla[]>(() =>
    this.visibles().map((c) => {
      const estado = c.estadoPago ?? 'pendiente';
      return {
        cuenta: fechaHora(c.fecha),
        cuentaSub: `${c.porcentaje} % · ${c.enviada ? 'aviso enviado al área' : 'aviso pendiente'}`,
        cuentaOrden: c.fecha,
        broker: c.broker ?? '—',
        brokerSub: c.comercial ?? '',
        polizas: c.polizas,
        valor: cop(c.totalValor),
        valorOrden: c.totalValor,
        comision: cop(c.totalComision),
        comisionOrden: c.totalComision,
        estado: (this.pago[estado] ?? { etiqueta: estado }).etiqueta,
        estadoVariante: (this.pago[estado] ?? { variante: 'info' as VarianteBadge }).variante,
        pagado: estado === 'pagada' ? cop(c.valorPagado ?? c.totalComision) : '—',
        pagadoSub: estado === 'pagada' && c.pagadoAt ? fechaCorta(c.pagadoAt) : estado === 'rechazada' ? c.motivoPago ?? '' : '',
        ...celdasFechas(c.fecha, c.ultimoMovimiento),
        gestionar: '',
      };
    }),
  );

  protected readonly totalPendiente = computed(() =>
    this.cuentas().filter((c) => (c.estadoPago ?? 'pendiente') === 'pendiente').reduce((t, c) => t + c.totalComision, 0),
  );
  protected readonly totalPagado = computed(() =>
    this.cuentas().filter((c) => c.estadoPago === 'pagada').reduce((t, c) => t + (c.valorPagado ?? c.totalComision), 0),
  );
  protected readonly pendientes = computed(() => this.cuentas().filter((c) => (c.estadoPago ?? 'pendiente') === 'pendiente').length);

  // --- Modal ---
  protected readonly seleccionada = signal<CuentaCobroResponse | null>(null);
  protected readonly pestana = signal('detalle');
  protected readonly pestanas = computed<readonly Tab[]>(() => [
    { id: 'detalle', etiqueta: 'Detalle' },
    { id: 'documento', etiqueta: 'Documento' },
    ...(this.esAdmin ? [{ id: 'pago', etiqueta: 'Registrar pago' }] : []),
  ]);
  protected readonly archivo = signal<Blob | null>(null);
  protected readonly cargandoArchivo = signal(false);
  protected readonly opcionesPago: readonly OpcionSegmentada[] = [
    { valor: 'pagada', etiqueta: 'Pagada', icono: 'paid' },
    { valor: 'rechazada', etiqueta: 'Rechazada', icono: 'block' },
    { valor: 'pendiente', etiqueta: 'Pendiente', icono: 'schedule' },
  ];
  protected readonly estadoPago = signal('pagada');
  protected readonly valorPagado = signal('');
  protected readonly fechaPago = signal('');
  protected readonly referencia = signal('');
  protected readonly motivo = signal('');
  protected readonly guardando = signal(false);
  protected readonly errorPago = signal('');
  protected readonly hoy = new Date().toISOString().slice(0, 10);

  protected readonly ficha = computed<readonly SeccionFicha[]>(() => {
    const c = this.seleccionada();
    if (!c) return [];
    return [
      {
        titulo: 'Cuenta de cobro',
        icono: 'receipt_long',
        datos: [
          { etiqueta: 'Broker', valor: c.broker },
          { etiqueta: 'Comercial', valor: c.comercial },
          { etiqueta: 'Generada', valor: fechaHora(c.fecha) },
          { etiqueta: 'Acuerdo', valor: `${c.porcentaje} %` },
          { etiqueta: 'Valor pagado por propietarios', valor: cop(c.totalValor) },
          { etiqueta: 'Comisión a cobrar', valor: cop(c.totalComision), destacado: true },
          { etiqueta: 'En letras', valor: c.enLetras, ancho: true },
          { etiqueta: 'Pólizas cobradas', valor: (c.numerosPoliza ?? []).join(' · '), ancho: true },
        ],
      },
      {
        titulo: 'Pago de la comisión',
        icono: 'payments',
        datos: [
          { etiqueta: 'Estado', valor: (this.pago[c.estadoPago ?? 'pendiente'] ?? { etiqueta: c.estadoPago }).etiqueta },
          { etiqueta: 'Valor pagado', valor: c.valorPagado === null || c.valorPagado === undefined ? null : cop(c.valorPagado) },
          { etiqueta: 'Fecha de pago', valor: c.pagadoAt ? fechaCorta(c.pagadoAt) : null },
          { etiqueta: 'Referencia', valor: c.referenciaPago },
          { etiqueta: 'Motivo de rechazo', valor: c.motivoPago },
          { etiqueta: 'Último movimiento', valor: fechaHora(c.ultimoMovimiento ?? c.fecha) },
        ],
      },
    ];
  });

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.admin
      .listarCuentasCobro()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => {
          this.cuentas.set(c);
          this.cargando.set(false);
        },
        error: () => {
          this.cuentas.set([]);
          this.cargando.set(false);
          this.error.set(true);
        },
      });
  }

  protected v(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLTextAreaElement).value;
  }

  protected gestionar(evento: AccionFila): void {
    const c = this.visibles().at(evento.indice);
    if (!c) return;
    this.seleccionada.set(c);
    this.estadoPago.set((c.estadoPago ?? 'pendiente') === 'pendiente' ? 'pagada' : c.estadoPago ?? 'pagada');
    this.valorPagado.set(String(c.valorPagado ?? c.totalComision));
    this.fechaPago.set(c.pagadoAt ?? this.hoy);
    this.referencia.set(c.referenciaPago ?? '');
    this.motivo.set(c.motivoPago ?? '');
    this.errorPago.set('');
    this.cambiarPestana('detalle');
  }

  protected cambiarPestana(p: string): void {
    this.pestana.set(p);
    const c = this.seleccionada();
    if (p !== 'documento' || !c) return;
    this.archivo.set(null);
    this.cargandoArchivo.set(true);
    this.comisiones
      .descargarPdf(c.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (b) => {
          this.archivo.set(b);
          this.cargandoArchivo.set(false);
        },
        error: () => this.cargandoArchivo.set(false),
      });
  }

  protected registrarPago(): void {
    const c = this.seleccionada();
    if (!c) return;
    const estado = this.estadoPago() as 'pendiente' | 'pagada' | 'rechazada';
    this.guardando.set(true);
    this.errorPago.set('');
    this.consola
      .registrarPago(c.id, {
        estado,
        valorPagado: estado === 'pagada' ? Number(this.valorPagado().replace(/\D/g, '')) || undefined : undefined,
        fecha: estado === 'pagada' ? this.fechaPago() : undefined,
        referencia: estado === 'pagada' ? this.referencia().trim() || undefined : undefined,
        motivo: estado === 'rechazada' ? this.motivo().trim() || undefined : undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.seleccionada.set(null);
          this.mensaje.set(
            estado === 'pagada'
              ? `Pago registrado: ${c.broker} recibió su comisión.`
              : estado === 'rechazada'
                ? `Cuenta rechazada: ${c.broker} puede volver a cobrar esas pólizas.`
                : 'La cuenta volvió a pendiente.',
          );
          this.cargar();
        },
        error: (err: unknown) => {
          this.guardando.set(false);
          this.errorPago.set(mensajeErrorIntegracion(err));
        },
      });
  }
}
