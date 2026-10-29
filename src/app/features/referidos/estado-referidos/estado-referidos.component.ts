import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import {
  KpiCardComponent,
  DataTableComponent,
  GridLayoutComponent,
  AlertBannerComponent,
  PageHeaderComponent,
  BotonComponent,
  SkeletonComponent,
  CalloutCardComponent,
  FichaComponent,
  ModalDialogComponent,
} from '../../../shared/components';
import type { AccionFila, SeccionFicha } from '../../../shared/components';
import { FilterTabsComponent } from '../../../shared/components/filter-tabs/filter-tabs.component';
import type { FilterTab } from '../../../shared/components/filter-tabs/filter-tabs.component';
import { Router } from '@angular/router';
import { coincideEstado } from '../referido-filtro';
import type { ColumnaTabla } from '../../../shared/components';
import { estadoABadge } from '../../../shared/pipes/estado-badge';
import {
  ReferidosService,
  type Referido,
} from '../../../core/services/referidos.service';
import { calcularKpisReferidos } from '../referido-kpis';

/**
 * EstadoReferidosComponent — "Estado referidos" (Req 15.4, 15.5).
 *
 * Muestra los KPIs de referidos (total, aceptadas, en proceso, rechazadas) y la
 * tabla de referidos con su estado, reutilizando el `DataTableComponent` (con
 * búsqueda incrustada y ordenamiento). Los KPIs se derivan con `calcularKpisReferidos`.
 *
 * Los datos provienen del API_Backend vía `ReferidosService`; la presentación no
 * realiza cálculo autoritativo.
 */
@Component({
  selector: 'app-estado-referidos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    KpiCardComponent,
    DataTableComponent,
    GridLayoutComponent,
    AlertBannerComponent,
    PageHeaderComponent,
    BotonComponent,
    SkeletonComponent,
    CalloutCardComponent,
    FilterTabsComponent,
    FichaComponent,
    ModalDialogComponent,
  ],
  templateUrl: './estado-referidos.component.html',
  styleUrl: './estado-referidos.component.scss',
})
export class EstadoReferidosComponent {
  private readonly referidosService = inject(ReferidosService);
  private readonly router = inject(Router);

  /** Pestaña de estado activa ('' = todos). */
  protected readonly estadoActivo = signal('todos');

  protected readonly pestanas = computed<FilterTab[]>(() => {
    const k = this.kpis();
    return [
      { id: 'todos', label: 'Todos', conteo: k.total },
      { id: 'aceptada', label: 'Aceptadas', conteo: k.aceptadas },
      { id: 'en proceso', label: 'En proceso', conteo: k.enProceso },
      { id: 'rechazada', label: 'Rechazadas', conteo: k.rechazadas, color: 'error' },
    ];
  });

  /** Tasa de conversión (aceptadas / total) para el KPI de aceptadas. */
  protected readonly conversion = computed(() => {
    const k = this.kpis();
    return k.total > 0 ? `${((k.aceptadas / k.total) * 100).toFixed(1)}% conversión` : 'Sin datos';
  });

  protected readonly tasaRechazo = computed(() => {
    const k = this.kpis();
    return k.total > 0 ? `${((k.rechazadas / k.total) * 100).toFixed(1)}% tasa` : 'Sin datos';
  });

  protected nuevoReferido(): void {
    void this.router.navigate(['/app/referidos']);
  }

  /** Lista completa de referidos recibida del backend (Req 15.4). */
  protected readonly referidos = signal<readonly Referido[]>([]);

  /** Total de referidos informado por el backend (Req 15.4). */
  protected readonly totalBackend = signal(0);

  /** Indica si la carga inicial está en curso. */
  protected readonly cargando = signal(false);

  /** Mensaje de error genérico de carga, sin exponer detalles internos. */
  protected readonly errorCarga = signal('');

  /** KPIs derivados de la lista completa de referidos (Req 15.4). */
  protected readonly kpis = computed(() => calcularKpisReferidos(this.referidos()));

  /** Columnas del DataTable de referidos, con sort e insignia de estado (Req 15.4). */
  protected readonly columnas: readonly ColumnaTabla[] = [
    { key: 'nombre', header: 'Nombre', ordenable: true },
    { key: 'producto', header: 'Producto interés', ordenable: true },
    { key: 'estado', header: 'Estado', tipo: 'badge', ordenable: true },
    { key: 'fecha', header: 'Fecha referido', ordenable: true },
    { key: 'ver', header: '', tipo: 'accion', textoAccion: 'Ver' },
  ];

  private readonly visibles = computed(() =>
    this.referidos().filter((r) => coincideEstado(r, this.estadoActivo() === 'todos' ? undefined : this.estadoActivo())),
  );

  /** Filas mapeadas para el DataTable, con la variante de insignia por estado. */
  protected readonly filas = computed(() =>
    this.visibles().map((r) => ({
      nombre: r.nombre,
      producto: r.producto,
      estado: r.estado,
      estadoVariante: estadoABadge(r.estado).replace('badge-', ''),
      fecha: r.fecha,
      ver: '',
    })),
  );

  /** Referido abierto en el detalle («Ver»). Cédula y celular llegan enmascarados del backend. */
  protected readonly detalle = signal<Referido | null>(null);
  protected readonly ficha = computed<readonly SeccionFicha[]>(() => {
    const r = this.detalle();
    if (!r) return [];
    return [
      {
        titulo: 'Referido',
        icono: 'person_add',
        datos: [
          { etiqueta: 'Radicado', valor: r.radicado },
          { etiqueta: 'Nombre', valor: r.nombre },
          { etiqueta: 'Cédula', valor: r.cedula },
          { etiqueta: 'Celular', valor: r.celular },
          { etiqueta: 'Producto de interés', valor: r.producto },
          { etiqueta: 'Estado', valor: r.estado },
          { etiqueta: 'Fecha referido', valor: r.fecha },
        ],
      },
    ];
  });

  protected ver(evento: AccionFila): void {
    this.detalle.set(this.visibles()[evento.indice] ?? null);
  }

  /** Radicado que llega del buscador (Ctrl + K): se abre su detalle al cargar, una sola vez. */
  private readonly parametros = toSignal(inject(ActivatedRoute).queryParamMap, { requireSync: true });
  private radicadoAbierto = '';
  private readonly abrirDesdeBuscador = effect(() => {
    const q = this.parametros().get('q');
    const r = q && q !== this.radicadoAbierto ? this.referidos().find((x) => x.radicado === q) : undefined;
    if (r) {
      this.radicadoAbierto = r.radicado ?? '';
      untracked(() => this.detalle.set(r));
    }
  });

  constructor() {
    this.cargar();
  }

  /**
   * Carga los KPIs y el listado de referidos desde el API_Backend (Req 15.4).
   * El filtrado por texto/estado se aplica en el cliente sobre la lista recibida.
   */
  protected cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.referidosService.listar({}).subscribe({
      next: (respuesta) => {
        this.referidos.set(respuesta.referidos);
        this.totalBackend.set(respuesta.total);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.errorCarga.set('No pudimos cargar los referidos. Intenta de nuevo.');
      },
    });
  }
}
