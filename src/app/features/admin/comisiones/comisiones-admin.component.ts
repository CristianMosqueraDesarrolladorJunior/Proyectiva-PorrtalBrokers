import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import type { CuentaCobroResponse } from '../../../core/models/comisiones.model';
import { AdminService } from '../../../core/services/admin.service';
import { COLUMNA_GESTIONAR, COLUMNAS_FECHAS, celdasFechas, cop, copCompacto, fechaHora } from '../../../core/services/admin.helpers';
import { ComisionesService } from '../../../core/services/comisiones.service';
import {
  DataTableComponent,
  EstadoVistaComponent,
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
    DataTableComponent,
    EstadoVistaComponent,
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
  private readonly destroyRef = inject(DestroyRef);

  protected readonly esAdmin = this.admin.esAdmin();
  protected readonly compacto = copCompacto;

  protected readonly cuentas = signal<readonly CuentaCobroResponse[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal(false);

  protected readonly columnas: readonly ColumnaTabla[] = [
    { key: 'cuenta', header: 'Cuenta de cobro', tipo: 'principal', ordenable: true },
    { key: 'broker', header: 'Broker', tipo: 'principal', ordenable: true },
    { key: 'polizas', header: 'Pólizas', alinear: 'derecha' },
    { key: 'comision', header: 'Comisión cobrada', alinear: 'derecha', ordenable: true },
    ...COLUMNAS_FECHAS,
    COLUMNA_GESTIONAR,
  ];

  protected readonly filas = computed<readonly FilaTabla[]>(() =>
    this.cuentas().map((c) => ({
      cuenta: `N° ${c.consecutivo}`,
      cuentaSub: `${fechaHora(c.fecha)} · ${c.porcentaje} % de acuerdo`,
      cuentaOrden: c.fecha,
      broker: c.broker ?? '—',
      brokerSub: c.comercial ?? '',
      polizas: c.polizas,
      comision: cop(c.totalComision),
      comisionOrden: c.totalComision,
      ...celdasFechas(c.fecha, c.fecha),
      gestionar: '',
      gestionarTexto: 'Ver documento',
    })),
  );

  protected readonly totalDocumentos = computed(() => this.cuentas().reduce((t, c) => t + c.totalComision, 0));
  protected readonly totalPolizas = computed(() => this.cuentas().reduce((t, c) => t + c.polizas, 0));

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
    return [
      {
        titulo: 'Cuenta de cobro',
        icono: 'receipt_long',
        datos: [
          { etiqueta: 'Broker', valor: c.broker },
          { etiqueta: 'Comercial', valor: c.comercial },
          { etiqueta: 'Generada', valor: fechaHora(c.fecha) },
          { etiqueta: 'Acuerdo', valor: `${c.porcentaje} %` },
          { etiqueta: 'Comisión cobrada', valor: cop(c.totalComision), destacado: true },
          { etiqueta: 'Número', valor: `N° ${c.consecutivo}` },
          { etiqueta: 'En letras', valor: c.enLetras, ancho: true },
          { etiqueta: 'Pólizas incluidas', valor: (c.numerosPoliza ?? []).join(' · '), ancho: true },
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
          // Las rechazadas no cuentan como documentos vigentes (auditoría X1).
          this.cuentas.set(c.filter((x) => x.estadoPago !== 'rechazada'));
          this.cargando.set(false);
        },
        error: () => {
          this.cuentas.set([]);
          this.cargando.set(false);
          this.error.set(true);
        },
      });
  }

  protected abrir(evento: AccionFila): void {
    const c = this.cuentas().at(evento.indice);
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
