import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, startWith, switchMap } from 'rxjs';

import type { Movimiento, RendimientoConsola, ResumenConsola, SincronizacionConsola } from '../../../core/models/consola.model';
import { ComisionesMesComponent, type ComisionDia } from '../../../shared/components/comisiones-mes/comisiones-mes.component';
import { AdminService } from '../../../core/services/admin.service';
import { celdasFechas, copCompacto } from '../../../core/services/admin.helpers';
import { ConsolaService } from '../../../core/services/consola.service';
import { SessionService } from '../../../core/services/session.service';
import {
  DataTableComponent,
  EstadoVistaComponent,
  FormSectionCardComponent,
  GridLayoutComponent,
  KpiCardComponent,
  PageHeaderComponent,
  RankingBarrasComponent,
} from '../../../shared/components';
import type { ColumnaTabla, FilaTabla, ItemRanking } from '../../../shared/components';

/** Refresco de los movimientos en vivo. */
const REFRESCO_MS = 30_000;

/**
 * Resumen del comportamiento del negocio: dinero que entra (brokers vs prospectos), comisión cobrada,
 * brokers top y los movimientos del sistema en vivo. Comercial: solo su cartera.
 */
@Component({
  selector: 'app-admin-resumen',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DataTableComponent,
    EstadoVistaComponent,
    FormSectionCardComponent,
    GridLayoutComponent,
    KpiCardComponent,
    PageHeaderComponent,
    RankingBarrasComponent,
    ComisionesMesComponent,
  ],
  templateUrl: './resumen.component.html',
  styleUrls: ['../admin-comun.scss'],
})
export class ResumenComponent {
  private readonly consola = inject(ConsolaService);
  private readonly session = inject(SessionService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly esAdmin = inject(AdminService).esAdmin();
  protected readonly perfil = this.session.perfil;
  protected readonly compacto = copCompacto;

  /** Rendimiento y conversión; si no carga, el resumen sigue igual. */
  protected readonly rendimiento = signal<RendimientoConsola | null>(null);
  protected readonly mesGrafica = signal(mesIso(new Date()));
  protected readonly comisionesMes = signal<readonly ComisionDia[] | null>(null);

  /** Sincronizaciones con el Warehouse: cuándo corrió cada una y si falló (transacciones observables). */
  protected readonly sincronizaciones = signal<readonly SincronizacionConsola[]>([]);
  protected readonly columnasSincronizacion: readonly ColumnaTabla[] = [
    { key: 'proceso', header: 'Proceso', tipo: 'principal' },
    { key: 'ultima', header: 'Última corrida' },
    { key: 'detalle', header: 'Resultado', tipo: 'principal' },
    { key: 'estado', header: 'Estado', tipo: 'badge' },
  ];
  protected readonly filasSincronizacion = computed<readonly FilaTabla[]>(() =>
    this.sincronizaciones().map((s) => ({
      proceso: NOMBRE_PROCESO[s.proceso] ?? s.proceso,
      procesoSub: FUENTE_PROCESO[s.proceso] ?? '',
      ultima: new Date(s.ultimaCorrida).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }),
      detalle: s.error ? 'No se pudo leer la hoja' : s.detalle ?? `${s.filas} filas`,
      detalleSub: s.error
        ? `${s.error}${s.ultimaExitosa ? ' · último dato bueno: ' + new Date(s.ultimaExitosa).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : ''}`
        : '',
      estado: s.error ? 'Con error' : 'Al día',
      estadoVariante: s.error ? 'danger' : 'success',
    })),
  );

  /** Porcentaje entero de a sobre b (0 si b es 0). */
  protected pct(a: number, b: number): number {
    return b ? Math.round((a / b) * 100) : 0;
  }

  protected cambiarMesGrafica(delta: number): void {
    const [a, m] = this.mesGrafica().split('-').map(Number);
    this.mesGrafica.set(mesIso(new Date(a, m - 1 + delta, 1)));
    this.cargarComisionesMes();
    this.consola
      .sincronizaciones()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (s) => this.sincronizaciones.set(s), error: () => this.sincronizaciones.set([]) });
  }

  private cargarComisionesMes(): void {
    this.comisionesMes.set(null);
    this.consola
      .comisionesPorDia(this.mesGrafica())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (d) => this.comisionesMes.set(d), error: () => this.comisionesMes.set([]) });
  }

  /** Retención = renovadas / pólizas con decisión cerrada (renovadas + no renovadas). */
  protected retencion(r: ResumenConsola): number {
    const cerradas = r.indicadores.renovadas + r.indicadores.noRenovadas;
    return cerradas ? Math.round((r.indicadores.renovadas / cerradas) * 100) : 0;
  }

  protected readonly resumen = signal<ResumenConsola | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal(false);

  protected readonly movimientos = signal<readonly Movimiento[]>([]);
  protected readonly actualizado = signal<Date | null>(null);

  protected readonly columnasMovimientos: readonly ColumnaTabla[] = [
    { key: 'fecha', header: 'Fecha', ordenable: true },
    { key: 'tipo', header: 'Movimiento', tipo: 'badge', ordenable: true },
    { key: 'descripcion', header: 'Detalle' },
    { key: 'broker', header: 'Broker', ordenable: true },
    { key: 'referencia', header: 'Referencia' },
  ];

  protected readonly filasMovimientos = computed<readonly FilaTabla[]>(() =>
    this.movimientos().map((m) => ({
      fecha: celdasFechas(m.fecha, m.fecha).creado,
      fechaOrden: m.fecha,
      tipo: m.tipo,
      tipoVariante: m.tipo === 'Pago' ? 'success' : m.tipo === 'Prospecto' ? 'warning' : 'info',
      descripcion: m.descripcion,
      broker: m.broker ?? '—',
      referencia: m.referencia ?? '—',
    })),
  );

  protected readonly topBrokers = computed<readonly ItemRanking[]>(() =>
    // Solo quien ya tiene pólizas: un prospecto sin negocios no es un broker destacado (auditoría Z6).
    (this.resumen()?.topBrokers ?? []).filter((b) => b.polizas > 0).map((b) => ({
      etiqueta: `${b.nombre}${b.estado === 'PROSPECTO' ? ' · prospecto' : ''}`,
      valor: b.primas,
      valorTexto: `${copCompacto(b.primas)} · ${b.polizas} pólizas`,
    })),
  );

  protected readonly dinero = computed<readonly ItemRanking[]>(() => {
    const r = this.resumen();
    if (!r) return [];
    return [
      { etiqueta: 'Ingresos de brokers registrados', valor: r.ingresosBrokers, valorTexto: copCompacto(r.ingresosBrokers) },
      { etiqueta: 'Ingresos de prospectos', valor: r.ingresosProspectos, valorTexto: copCompacto(r.ingresosProspectos) },
      { etiqueta: 'Comisión en cuentas de cobro', valor: r.comisionCobrada, valorTexto: copCompacto(r.comisionCobrada) },
    ];
  });

  constructor() {
    this.cargarResumen();
    this.consola
      .rendimiento()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (r) => this.rendimiento.set(r), error: () => this.rendimiento.set(null) });
    this.cargarComisionesMes();
    // Movimientos en vivo: primera carga inmediata y luego cada 30 s mientras la vista esté abierta.
    interval(REFRESCO_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.consola.movimientos(50)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (m) => {
          this.movimientos.set(m);
          this.actualizado.set(new Date());
        },
        error: () => this.movimientos.set([]),
      });
  }

  protected cargarResumen(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.consola
      .resumen()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.resumen.set(r);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.error.set(true);
        },
      });
  }
}

function mesIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const NOMBRE_PROCESO: Record<string, string> = {
  consolidado: 'Estados de radicación',
  renovaciones: 'Renovaciones',
  comisiones: 'Pagos de comisión',
  negocios: 'Histórico de negocios',
};

const FUENTE_PROCESO: Record<string, string> = {
  consolidado: 'Consolidado · cada 5 min',
  renovaciones: 'Warehouse de renovaciones (JSON) · cada 15 min',
  comisiones: 'Base Facturación · cada 10 min',
  negocios: 'Seguimiento Corretaje (Negocios) · cada 30 min',
};
