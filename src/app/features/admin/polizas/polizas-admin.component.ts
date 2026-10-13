import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CatalogoService } from '../../../core/services/catalogo.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Observable } from 'rxjs';

import type { PolizaConsola } from '../../../core/models/consola.model';
import { AdminService } from '../../../core/services/admin.service';
import { COLUMNA_GESTIONAR, COLUMNAS_FECHAS, celdasFechas, cop, copCompacto, fechaCorta, fechaHora } from '../../../core/services/admin.helpers';
import { ComisionesService } from '../../../core/services/comisiones.service';
import { ConsolaService } from '../../../core/services/consola.service';
import {
  BadgeEstadoComponent,
  BarraAccionesComponent,
  DataTableComponent,
  EstadoVistaComponent,
  FichaComponent,
  GridLayoutComponent,
  KpiCardComponent,
  ModalDialogComponent,
  PageHeaderComponent,
  SegmentedControlComponent,
  VisorArchivoComponent,
} from '../../../shared/components';
import type { AccionFila, ColumnaTabla, FilaTabla, OpcionSegmentada, SeccionFicha, Tab, VarianteBadge } from '../../../shared/components';

/** Color de la insignia del pago de la comisión (presentación; etiqueta del catálogo `estado_pago_comision`). */
const VARIANTE_PAGO: Readonly<Partial<Record<string, VarianteBadge>>> = {
  pendiente: 'warning',
  pagada: 'success',
  rechazada: 'danger',
};

/**
 * Pólizas EXPEDIDAS (los negocios terminan al expedir; aquí no hay pólizas en estudio). Por cada una:
 * si ya se le pagó la comisión al broker, la cuenta de cobro que la cobró y los documentos.
 */
@Component({
  selector: 'app-admin-polizas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeEstadoComponent,
    BarraAccionesComponent,
    DataTableComponent,
    EstadoVistaComponent,
    FichaComponent,
    GridLayoutComponent,
    KpiCardComponent,
    ModalDialogComponent,
    PageHeaderComponent,
    SegmentedControlComponent,
    VisorArchivoComponent,
  ],
  templateUrl: './polizas-admin.component.html',
  styleUrls: ['../admin-comun.scss'],
})
export class PolizasAdminComponent {
  private readonly consola = inject(ConsolaService);
  private readonly comisiones = inject(ComisionesService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly esAdmin = inject(AdminService).esAdmin();
  protected readonly compacto = copCompacto;
  protected readonly pago = inject(CatalogoService).insignias('estado_pago_comision', VARIANTE_PAGO, 'info' as VarianteBadge);

  protected readonly polizas = signal<readonly PolizaConsola[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal(false);

  protected readonly filtros: readonly OpcionSegmentada[] = [
    { valor: '', etiqueta: 'Todas' },
    { valor: 'pagada', etiqueta: 'Pagadas al broker' },
    { valor: 'pendiente', etiqueta: 'Pago pendiente' },
    { valor: 'sin_cobrar', etiqueta: 'Sin cuenta de cobro' },
  ];
  protected readonly filtro = signal('');

  protected readonly columnas: readonly ColumnaTabla[] = [
    { key: 'poliza', header: 'Póliza', tipo: 'principal', ordenable: true },
    { key: 'propietario', header: 'Propietario', ordenable: true },
    { key: 'broker', header: 'Broker', tipo: 'principal', ordenable: true },
    { key: 'comercial', header: 'Comercial', ordenable: true },
    { key: 'prima', header: 'Prima', alinear: 'derecha', ordenable: true },
    { key: 'comision', header: 'Comisión', alinear: 'derecha', ordenable: true },
    { key: 'vigencia', header: 'Vigencia', tipo: 'principal' },
    { key: 'pago', header: 'Pago al broker', tipo: 'badge', ordenable: true },
    ...COLUMNAS_FECHAS,
    COLUMNA_GESTIONAR,
  ];

  protected readonly visibles = computed(() =>
    this.filtro() ? this.polizas().filter((p) => p.estadoPago === this.filtro()) : this.polizas(),
  );

  protected readonly filas = computed<readonly FilaTabla[]>(() =>
    this.visibles().map((p) => ({
      poliza: p.numero,
      polizaSub: p.radicado,
      propietario: p.propietario ?? '—',
      broker: p.broker,
      brokerSub: p.brokerEstado === 'PROSPECTO' ? 'Prospecto' : 'Broker registrado',
      comercial: p.comercial ?? 'Sin asignar',
      prima: p.prima === null ? '—' : cop(p.prima),
      primaOrden: p.prima ?? 0,
      comision: p.comision === null ? '—' : cop(p.comision),
      comisionOrden: p.comision ?? 0,
      vigencia: p.inicio ? fechaCorta(p.inicio) : '—',
      vigenciaSub: p.vence ? `hasta ${fechaCorta(p.vence)}` : '',
      pago: (this.pago[p.estadoPago] ?? { etiqueta: p.estadoPago }).etiqueta,
      pagoVariante: (this.pago[p.estadoPago] ?? { variante: 'info' }).variante,
      ...celdasFechas(p.creado, p.ultimoMovimiento),
      gestionar: '',
    })),
  );

  protected readonly pagadas = computed(() => this.polizas().filter((p) => p.estadoPago === 'pagada').length);
  protected readonly pendientes = computed(() => this.polizas().filter((p) => p.estadoPago === 'pendiente').length);
  protected readonly sinCobrar = computed(() => this.polizas().filter((p) => p.estadoPago === 'sin_cobrar').length);
  protected readonly primaTotal = computed(() => this.polizas().reduce((t, p) => t + (p.prima ?? 0), 0));

  // --- Modal ---
  protected readonly seleccionada = signal<PolizaConsola | null>(null);
  protected readonly pestana = signal('detalle');
  protected readonly pestanas = computed<readonly Tab[]>(() => [
    { id: 'detalle', etiqueta: 'Detalle' },
    { id: 'documento', etiqueta: 'Documento de la póliza' },
    ...(this.seleccionada()?.cuentaCobroId ? [{ id: 'cuenta', etiqueta: 'Cuenta de cobro' }] : []),
  ]);
  protected readonly archivo = signal<Blob | null>(null);
  protected readonly cargandoArchivo = signal(false);

  protected readonly ficha = computed<readonly SeccionFicha[]>(() => {
    const p = this.seleccionada();
    if (!p) return [];
    return [
      {
        titulo: 'Póliza de arrendamiento',
        icono: 'policy',
        datos: [
          { etiqueta: 'Número', valor: p.numero },
          { etiqueta: 'Negocio', valor: p.radicado },
          { etiqueta: 'Propietario (tomador)', valor: p.propietario },
          { etiqueta: 'Inicio de vigencia', valor: p.inicio ? fechaCorta(p.inicio) : null },
          { etiqueta: 'Fin de vigencia', valor: p.vence ? fechaCorta(p.vence) : null },
          { etiqueta: 'Prima total', valor: p.prima === null ? null : cop(p.prima), destacado: true },
        ],
      },
      {
        titulo: 'Comisión del broker',
        icono: 'payments',
        datos: [
          { etiqueta: 'Broker', valor: `${p.broker} (${p.brokerEstado === 'PROSPECTO' ? 'prospecto' : 'registrado'})` },
          { etiqueta: 'Comercial', valor: p.comercial },
          { etiqueta: 'Comisión', valor: p.comision === null ? null : cop(p.comision), destacado: true },
          { etiqueta: 'Estado del pago', valor: (this.pago[p.estadoPago] ?? { etiqueta: p.estadoPago }).etiqueta },
          { etiqueta: 'Cuenta de cobro', valor: p.cuentaCobroFecha ? `Generada el ${fechaHora(p.cuentaCobroFecha)}` : 'Aún no la cobra' },
          { etiqueta: 'Expedida', valor: fechaHora(p.creado) },
          { etiqueta: 'Último movimiento', valor: fechaHora(p.ultimoMovimiento ?? p.creado) },
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
    this.consola
      .polizas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.polizas.set(p);
          this.cargando.set(false);
        },
        error: () => {
          this.polizas.set([]);
          this.cargando.set(false);
          this.error.set(true);
        },
      });
  }

  protected gestionar(evento: AccionFila): void {
    const p = this.visibles().at(evento.indice);
    if (!p) return;
    this.seleccionada.set(p);
    this.cambiarPestana('detalle');
  }

  protected cambiarPestana(pestana: string): void {
    this.pestana.set(pestana);
    const p = this.seleccionada();
    if (!p || pestana === 'detalle') return;
    const fuente: Observable<Blob> | null = pestana === 'documento'
      ? this.consola.documentoPoliza(p.numero)
      : p.cuentaCobroId ? this.comisiones.descargarPdf(p.cuentaCobroId) : null;
    if (!fuente) return;
    this.archivo.set(null);
    this.cargandoArchivo.set(true);
    fuente.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (b) => {
        this.archivo.set(b);
        this.cargandoArchivo.set(false);
      },
      error: () => this.cargandoArchivo.set(false),
    });
  }
}
