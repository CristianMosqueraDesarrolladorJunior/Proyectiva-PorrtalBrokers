import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import type { CuentaCobroResponse } from '../../../core/models/comisiones.model';
import { AdminService, type FacturaArea } from '../../../core/services/admin.service';
import { COLUMNA_GESTIONAR, COLUMNAS_FECHAS, celdasFechas, cop, copCompacto, fechaHora } from '../../../core/services/admin.helpers';
import { ComisionesService } from '../../../core/services/comisiones.service';
import { ConsolaService } from '../../../core/services/consola.service';
import { SessionService } from '../../../core/services/session.service';
import {
  BotonComponent,
  DataTableComponent,
  EstadoVistaComponent,
  FiltradoInteligenteComponent,
  FichaComponent,
  GridLayoutComponent,
  KpiCardComponent,
  ModalDialogComponent,
  PageHeaderComponent,
  VisorArchivoComponent,
} from '../../../shared/components';
import type { AccionFila, ColumnaTabla, FilaTabla, SeccionFicha, Tab } from '../../../shared/components';
import { plural } from '../../../core/util/plural';

/**
 * Cuentas de cobro generadas por los brokers: solo el DOCUMENTO. La consola no maneja pagos: el broker cobra en la
 * plataforma de proveedores de Seguros Bolívar, fuera del portal. El Administrador ve todas; el Comercial, las de su cartera.
 */

@Component({
  selector: 'app-admin-comisiones',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BotonComponent,
    DataTableComponent,
    EstadoVistaComponent,
    FiltradoInteligenteComponent,
    FichaComponent,
    GridLayoutComponent,
    KpiCardComponent,
    ModalDialogComponent,
    PageHeaderComponent,
    VisorArchivoComponent,
  ],
  templateUrl: './comisiones-admin.component.html',
  styleUrls: ['../admin-comun.scss'],
})
export class ComisionesAdminComponent {
  protected readonly plural = plural;
  private readonly admin = inject(AdminService);
  private readonly comisiones = inject(ComisionesService);
  private readonly consola = inject(ConsolaService);
  private readonly session = inject(SessionService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly esAdmin = this.admin.esAdmin();
  protected readonly compacto = copCompacto;

  private readonly cuentasServidor = signal<readonly CuentaCobroResponse[]>([]);
  /** El servidor trae el código del comercial; se muestra su nombre (el comercial solo ve sus cuentas: es él). */
  private readonly nombresComercial = signal<ReadonlyMap<string, string>>(new Map());
  protected readonly cuentas = computed<readonly CuentaCobroResponse[]>(() => {
    const nombres = this.nombresComercial();
    const propio = this.esAdmin ? null : this.session.perfil()?.nombre ?? null;
    return this.cuentasServidor().map((c) => ({ ...c, comercial: nombres.get(c.comercial ?? '') ?? propio ?? c.comercial }));
  });
  protected readonly cargando = signal(false);
  protected readonly error = signal(false);

  protected readonly columnas: readonly ColumnaTabla[] = [
    { key: 'cuenta', header: 'Cuenta de cobro', tipo: 'principal', ordenable: true },
    { key: 'broker', header: 'Broker', tipo: 'principal', ordenable: true },
    { key: 'polizas', header: 'Pólizas', alinear: 'derecha' },
    { key: 'comision', header: 'Comisión cobrada', alinear: 'derecha', ordenable: true },
    { key: 'estado', header: 'Pago', tipo: 'badge', ordenable: true },
    ...COLUMNAS_FECHAS,
    COLUMNA_GESTIONAR,
  ];

  // --- Filtro (mismo componente que Seguimiento): comercial, broker, estado y fechas para las dos tablas ---
  protected readonly fComercial = signal('');
  protected readonly fBroker = signal('');
  protected readonly fEstado = signal('');
  protected readonly fDesde = signal('');
  protected readonly fHasta = signal('');
  protected readonly comercialesFiltro = computed(() =>
    [...new Set([...this.cuentas().map((c) => c.comercial), ...this.facturas().map((f) => f.comercial)]
      .filter((x): x is string => !!x))].sort());
  protected readonly hayFiltros = computed(
    () => !!(this.fComercial() || this.fBroker().trim() || this.fEstado() || this.fDesde() || this.fHasta()),
  );
  protected limpiarFiltros(): void {
    this.fComercial.set('');
    this.fBroker.set('');
    this.fEstado.set('');
    this.fDesde.set('');
    this.fHasta.set('');
  }
  private coincide(comercial: string | null | undefined, broker: string, nit: string, fecha: string | null): boolean {
    const q = this.fBroker().trim().toLowerCase();
    const dia = (fecha ?? '').slice(0, 10);
    return (!this.fComercial() || comercial === this.fComercial())
      && (!q || broker.toLowerCase().includes(q) || nit.includes(q))
      && (!this.fDesde() || (!!dia && dia >= this.fDesde()))
      && (!this.fHasta() || (!!dia && dia <= this.fHasta()));
  }
  /** Estado de pago de una cuenta del portal o de una factura del libro, con el mismo vocabulario. */
  private static estadoCuenta(c: CuentaCobroResponse): string {
    return c.estadoPago === 'pagada' ? 'pagada' : c.estadoPago === 'orden_pago' ? 'orden' : 'tramite';
  }
  private static estadoFactura(f: FacturaArea): string {
    return f.fechaPago ? 'pagada' : f.ordenPago ? 'orden' : 'tramite';
  }
  protected readonly cuentasVisibles = computed(() =>
    // La referencia (CDC-…) se busca en el mismo campo que el broker.
    this.cuentas().filter((c) => this.coincide(c.comercial, `${c.broker ?? ''} ${c.referencia}`, '', c.fecha)
      && (!this.fEstado() || ComisionesAdminComponent.estadoCuenta(c) === this.fEstado())));
  protected readonly facturasVisibles = computed(() =>
    this.facturas().filter((f) => this.coincide(f.comercial, f.broker ?? '', f.nit, f.fechaAprobacion)
      && (!this.fEstado() || ComisionesAdminComponent.estadoFactura(f) === this.fEstado())));

  protected readonly filas = computed<readonly FilaTabla[]>(() =>
    this.cuentasVisibles().map((c) => ({
      cuenta: `N° ${c.consecutivo}`,
      cuentaSub: `${c.referencia} · ${fechaHora(c.fecha)}`,
      cuentaOrden: c.fecha,
      broker: c.broker ?? '—',
      brokerSub: c.comercial ? `Comercial: ${c.comercial}` : '',
      polizas: c.polizas,
      estado: c.estadoPago === 'pagada' ? 'Pagada' : c.estadoPago === 'orden_pago' ? 'Con orden de pago' : 'En trámite',
      estadoVariante: c.estadoPago === 'pagada' ? 'success' : c.estadoPago === 'orden_pago' ? 'info' : 'warning',
      comision: cop(c.totalComision),
      comisionOrden: c.totalComision,
      ...celdasFechas(c.fecha, c.fecha),
      gestionar: '',
      gestionarTexto: 'Ver documento',
    })),
  );

  // Las tarjetas siguen el filtro, igual que la tabla.
  protected readonly totalDocumentos = computed(() => this.cuentasVisibles().reduce((t, c) => t + c.totalComision, 0));
  protected readonly totalPolizas = computed(() => this.cuentasVisibles().reduce((t, c) => t + c.polizas, 0));

  // --- Modal ---
  protected readonly seleccionada = signal<CuentaCobroResponse | null>(null);
  protected readonly pestana = signal('detalle');
  protected readonly pestanas: readonly Tab[] = [
    { id: 'detalle', etiqueta: 'Detalle' },
    { id: 'documento', etiqueta: 'Documento' },
  ];
  protected readonly archivo = signal<Blob | null>(null);
  protected readonly cargandoArchivo = signal(false);

  protected readonly ficha = computed<readonly SeccionFicha[]>(() => {
    const c = this.seleccionada();
    if (!c) return [];
    const polizas = c.numerosPoliza ?? [];
    // Secciones cortas y del mismo tipo de dato, para que nada quede suelto en la rejilla.
    return [
      {
        titulo: `Cuenta de cobro N° ${c.consecutivo}`,
        icono: 'receipt_long',
        datos: [
          { etiqueta: 'Referencia', valor: c.referencia },
          { etiqueta: 'Generada', valor: fechaHora(c.fecha) },
          { etiqueta: 'Estado del pago', valor: c.estadoPago === 'pagada' ? 'Pagada' : c.estadoPago === 'orden_pago' ? 'Con orden de pago' : 'En trámite' },
          { etiqueta: 'Broker', valor: c.broker },
          { etiqueta: 'Comercial', valor: c.comercial },
        ],
      },
      {
        titulo: 'Valor cobrado',
        icono: 'payments',
        datos: [
          { etiqueta: 'Comisión cobrada', valor: cop(c.totalComision), destacado: true },
          { etiqueta: 'Acuerdo del broker', valor: `${c.porcentaje} % sobre el valor sin IVA` },
          { etiqueta: 'En letras', valor: c.enLetras, ancho: true },
        ],
      },
      {
        titulo: plural(polizas.length, 'Póliza incluida', 'Pólizas incluidas'),
        icono: 'policy',
        datos: polizas.map((n, i) => ({ etiqueta: `Póliza ${i + 1}`, valor: n })),
      },
    ];
  });

  /** Facturación del área en el libro: cruza con el libro aunque el broker no haya generado su cuenta en el portal. */
  protected readonly facturas = signal<readonly FacturaArea[]>([]);
  protected readonly facturasPagadas = computed(() => this.facturasVisibles().filter((f) => !!f.fechaPago).length);
  protected readonly totalFacturado = computed(() => this.facturasVisibles().reduce((s, f) => s + f.total, 0));
  protected readonly columnasFacturas: readonly ColumnaTabla[] = [
    { key: 'factura', header: 'Factura', tipo: 'principal', ordenable: true },
    { key: 'broker', header: 'Broker', tipo: 'principal', ordenable: true },
    { key: 'polizas', header: 'Pólizas', alinear: 'derecha', ordenable: true },
    { key: 'total', header: 'Total facturado', alinear: 'derecha', ordenable: true },
    { key: 'pago', header: 'Pago', tipo: 'badge', ordenable: true },
  ];
  protected readonly filasFacturas = computed<readonly FilaTabla[]>(() =>
    this.facturasVisibles().map((f) => ({
      factura: f.factura ? `Factura ${f.factura}` : 'Sin número',
      facturaSub: f.fechaAprobacion ? `Aprobada el ${new Date(f.fechaAprobacion + 'T12:00:00').toLocaleDateString('es-CO')}` : '',
      broker: f.broker || 'Sin nombre',
      brokerSub: [f.nit ? `NIT/CC ${f.nit}` : '', f.comercial ? `Comercial: ${f.comercial}` : ''].filter(Boolean).join(' · '),
      polizas: f.polizas,
      total: cop(f.total),
      totalOrden: f.total,
      pago: f.fechaPago ? 'Pagada' : f.ordenPago ? 'Con orden de pago' : 'En trámite',
      pagoSub: f.fechaPago ? new Date(f.fechaPago + 'T12:00:00').toLocaleDateString('es-CO') : f.ordenPago ? `Orden ${f.ordenPago}` : '',
      pagoVariante: f.fechaPago ? 'success' : f.ordenPago ? 'info' : 'warning',
    })),
  );

  constructor() {
    this.cargar();
    // Llega desde el buscador de la barra superior con la referencia de la cuenta.
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((p) => {
        const q = p.get('q');
        if (q) {
          this.limpiarFiltros();
          this.fBroker.set(q);
        }
      });
    if (this.esAdmin) {
      this.consola.comerciales().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (cs) => this.nombresComercial.set(new Map(cs.map((x) => [x.codigo, x.nombre]))),
        error: () => this.nombresComercial.set(new Map()),
      });
    }
    this.admin.facturacionArea().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (f) => this.facturas.set(f),
      error: () => this.facturas.set([]),
    });
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.admin
      .listarCuentasCobro()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => {
          // Las rechazadas no cuentan como documentos vigentes (auditoría X1).
          this.cuentasServidor.set(c.filter((x) => x.estadoPago !== 'rechazada'));
          this.cargando.set(false);
        },
        error: () => {
          this.cuentasServidor.set([]);
          this.cargando.set(false);
          this.error.set(true);
        },
      });
  }

  protected abrir(evento: AccionFila): void {
    // La tabla muestra las cuentas filtradas: el índice es sobre esa lista.
    const c = this.cuentasVisibles().at(evento.indice);
    if (!c) return;
    this.seleccionada.set(c);
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
}
