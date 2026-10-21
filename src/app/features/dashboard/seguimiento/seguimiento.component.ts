import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { SessionService } from '../../../core/services/session.service';
import { moduloBloqueado } from '../../../core/models/cuenta.model';
import { CatalogoService } from '../../../core/services/catalogo.service';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import {
  SkeletonComponent,
  AlertBannerComponent,
  BotonComponent,
  DataTableComponent,
  FiltradoInteligenteComponent,
  QuickToolBannerComponent,
  PageHeaderComponent,
  GuaranteeBadgeComponent,
  KpiCardComponent,
  CommissionBreakdownCardComponent,
} from '../../../shared/components';
import type {
  AccionFila,
  ColumnaTabla,
} from '../../../shared/components/data-table/data-table.component';
import { DetalleSolicitudComponent } from '../detalle-solicitud/detalle-solicitud.component';
import {
  DashboardService,
  type ComisionesResponse,
  type FiltrosSolicitudes,
  type KpisDashboard,
} from '../../../core/services/dashboard.service';
import type { Solicitud } from '../../../core/models/solicitud.model';
import { estadoABadge } from '../../../shared/pipes/estado-badge';

import { formatearCop } from '../../../shared/util/moneda';
import { plural } from '../../../core/util/plural';
import { ACCESOS_SIDEBAR } from '../../shell/sidebar/sidebar.component';
/** Tamaño de página del Seguimiento: 10 solicitudes por página (Req 6.5). */
const TAMANO_PAGINA = 10;

/** Opciones de estado para el filtro (Req 6.2). */
const ESTADOS: readonly { readonly valor: string; readonly etiqueta: string }[] = [
  { valor: 'radicada', etiqueta: 'Radicada' },
  { valor: 'en_revision', etiqueta: 'En revisión' },
  { valor: 'aprobada', etiqueta: 'Aprobada' },
  { valor: 'bloqueada', etiqueta: 'Bloqueada' },
  { valor: 'observada', etiqueta: 'Observada' },
];

/**
 * SeguimientoComponent — Dashboard de Seguimiento (Req 5, 6).
 *
 * Sección principal del Shell_Aplicacion. Reutiliza los Componentes_Compartidos
 * `QuickToolBannerComponent` (banner "Herramienta Rápida", Req 5.1, 5.5),
 * `FiltradoInteligenteComponent` (filtros colapsables, Req 6.2),
 * `DataTableComponent` (tabla de solicitudes con paginación de 10, Req 6.1, 6.5),
 * `BadgeEstadoComponent` (insignias por estado, Req 5.4, 6.3) y monta el
 * `DetalleSolicitudComponent` (drawer al seleccionar una fila, Req 6.4, 34).
 *
 * La comisión estimada, los KPIs y el listado se obtienen del API_Backend vía
 * `DashboardService`/`HttpClient` (Req 5.6, 6.2). No hay cálculos autoritativos
 * en el cliente.
 */

@Component({
  selector: 'app-seguimiento',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SkeletonComponent,
    AlertBannerComponent,
    BotonComponent,
    FormsModule,
    QuickToolBannerComponent,
    FiltradoInteligenteComponent,
    DataTableComponent,
    DetalleSolicitudComponent,
    PageHeaderComponent,
    GuaranteeBadgeComponent,
    KpiCardComponent,
    CommissionBreakdownCardComponent,
  ],
  templateUrl: './seguimiento.component.html',
  styleUrl: './seguimiento.component.scss',
})
export class SeguimientoComponent {
  protected readonly plural = plural;
  private readonly dashboardService = inject(DashboardService);
  private readonly catalogo = inject(CatalogoService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  /** Tamaño de página expuesto a la plantilla (Req 6.5). */
  protected readonly tamanoPagina = TAMANO_PAGINA;

  /** Opciones de producto y estado para los filtros (Req 6.2). */
  /** Filtros desde los catálogos (`producto` y estados del seguimiento). */
  protected readonly productos = this.catalogo.opciones('producto').map((p) => p.descripcion);
  protected readonly estados = this.catalogo.seguimiento().map((e) => ({ valor: e.codigo, etiqueta: e.descripcion }));
  /** Plazo de cobro de comisiones por el portal (`COMISION_PLAZO_COBRO_MESES`). */
  protected readonly plazoCobroMeses = this.catalogo.parametro('COMISION_PLAZO_COBRO_MESES');

  /** Columnas de la tabla de solicitudes con sort y acción "Gestionar" (Req 6.1). */
  protected readonly columnas: readonly ColumnaTabla[] = [
    { key: 'referencia', header: 'Ref', ordenable: true, nowrap: true },
    { key: 'cliente', header: 'Propietario', ordenable: true },
    { key: 'producto', header: 'Producto', ordenable: true },
    { key: 'estadoLabel', header: 'Estado', tipo: 'badge', ordenable: true },
    { key: 'estadoPago', header: 'Pago de comisión' },
    { key: 'fecha', header: 'Fecha', ordenable: true, nowrap: true },
    { key: 'comisionLabel', header: 'Comisión', alinear: 'derecha', nowrap: true },
    { key: 'gestionar', header: '', tipo: 'accion', textoAccion: 'Gestionar', alinear: 'derecha' },
  ];

  // --- Comisiones y KPIs (Req 5.2, 5.3) ---
  protected readonly comisiones = signal<ComisionesResponse | null>(null);
  protected readonly kpis = signal<KpisDashboard | null>(null);

  // --- Listado de solicitudes (Req 6.1, 6.5) ---
  protected readonly solicitudes = signal<readonly Solicitud[]>([]);
  protected readonly total = signal(0);
  protected readonly paginaActual = signal(1);
  protected readonly cargandoTabla = signal(false);
  protected readonly errorTabla = signal<string | null>(null);

  // --- Filtros (Req 6.2) ---
  protected readonly busqueda = signal('');
  protected readonly producto = signal('');
  protected readonly estado = signal('');
  protected readonly fechaDesde = signal('');
  protected readonly fechaHasta = signal('');

  // --- Detalle de solicitud seleccionada (Req 6.4, 34) ---
  protected readonly referenciaSeleccionada = signal<string | null>(null);

  /** Módulo al que se intentó entrar sin tenerlo habilitado (lo indica el guard de módulos). */
  protected readonly moduloBloqueado = signal<string | null>(null);

  /** Lo que se le habilita al prospecto al aprobarse (catálogo de módulos restringidos). */
  protected readonly modulosPorHabilitar = computed(() => {
    const enMenu = new Set(ACCESOS_SIDEBAR.map((a) => a.ruta));
    const nombres = this.catalogo.modulosRestringidos().filter((m) => enMenu.has(m.ruta))
      .map((m) => ACCESOS_SIDEBAR.find((a) => a.ruta === m.ruta)?.etiqueta ?? m.etiqueta);
    return nombres.length > 1 ? `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}` : (nombres[0] ?? 'más secciones');
  });

  /** Nombre de la sección bloqueada tal como aparece en el menú. */
  protected etiquetaModulo(ruta: string): string {
    return this.catalogo.modulosRestringidos().find((m) => m.ruta === ruta)?.etiqueta ?? 'Esta sección';
  }

  /** Filas mapeadas para el DataTableComponent (con etiquetas legibles). */
  protected readonly filas = computed(() =>
    this.solicitudes().map((s) => ({
      referencia: s.referencia,
      cliente: s.cliente,
      producto: s.producto,
      estadoLabel: this.catalogo.etiquetaSeguimiento(s.estado),
      estadoLabelVariante: estadoABadge(s.estado).replace('badge-', ''),
      estadoPago: s.estadoPago,
      fecha: s.fecha,
      comisionLabel: s.comision > 0 ? this.formatearCop(s.comision) : '—',
      gestionar: '',
      // "Gestionar" solo cuando el broker debe corregir; el resto solo se consulta.
      gestionarTexto: s.estado === 'observada' ? '' : 'Ver detalle',
    })),
  );

  constructor() {
    this.cargarDashboard();
    // Búsqueda global de la barra superior: /app/seguimiento?q=texto
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        this.moduloBloqueado.set(params.get('bloqueado'));
        // Enlaces viejos a la corrección (/app/correccion) llegan aquí: se abre el detalle con la gestión dentro del modal.
        const gestionar = params.get('gestionar')?.trim();
        if (gestionar) {
          this.referenciaSeleccionada.set(gestionar);
        }
        const q = params.get('q');
        if (q !== null && q !== this.busqueda()) {
          this.busqueda.set(q);
          this.paginaActual.set(1);
        }
        this.cargarSolicitudes();
      });
  }

  /** Navega al Cotizador desde el banner "Herramienta Rápida" (Req 5.5). */
  protected irAlCotizador(): void {
    void this.router.navigate(['/app/cotizador']);
  }

  /** Aplica los filtros y recarga desde la primera página (Req 6.2). */
  protected aplicarFiltros(): void {
    this.paginaActual.set(1);
    this.cargarSolicitudes();
  }

  /** Limpia los filtros y recarga el listado completo (Req 6.2). */
  protected limpiarFiltros(): void {
    this.busqueda.set('');
    this.producto.set('');
    this.estado.set('');
    this.fechaDesde.set('');
    this.fechaHasta.set('');
    this.paginaActual.set(1);
    this.cargarSolicitudes();
  }

  /** Cambia de página del listado (Req 6.5). */
  protected onCambioPagina(pagina: number): void {
    this.paginaActual.set(pagina);
    this.cargarSolicitudes();
  }

  /** Abre el Detalle_Solicitud de la fila seleccionada (Req 6.4, 34). */
  protected onSeleccionFila(indice: number): void {
    const solicitud = this.solicitudes()[indice];
    if (solicitud) {
      this.referenciaSeleccionada.set(solicitud.referencia);
    }
  }

  /** Gestiona la solicitud desde el botón de la columna de acción (Req 6.4). */
  protected onGestionar(evento: AccionFila): void {
    this.onSeleccionFila(evento.indice);
  }

  /** Cierra el drawer de detalle y regresa a la tabla (Req 34.3). */
  protected onCerrarDetalle(): void {
    this.referenciaSeleccionada.set(null);
  }

  /** El prospecto no ve comisiones (módulo restringido): sin tarjeta de comisión en el tablero. */
  protected readonly veComisiones = computed(() => {
    const estado = this.session.perfil()?.estadoCuenta;
    return !estado || !moduloBloqueado(estado, 'comisiones', this.catalogo.modulosRestringidos().map((m) => m.ruta));
  });

  /** Obtiene comisiones y KPIs del backend (Req 5.2, 5.3, 5.6). */
  private cargarDashboard(): void {
    // Las comisiones son un módulo restringido para el prospecto (catálogo `modulo_portal`): no se piden.
    if (this.veComisiones()) {
      this.dashboardService.obtenerComisiones().subscribe({
        next: (c) => this.comisiones.set(c),
        error: () => this.comisiones.set(null),
      });
    }
    this.dashboardService.obtenerKpis().subscribe({
      next: (k) => this.kpis.set(k),
      error: () => this.kpis.set(null),
    });
  }

  /** Obtiene el listado filtrado y paginado de solicitudes (Req 6.2, 6.5). */
  protected cargarSolicitudes(): void {
    this.cargandoTabla.set(true);
    this.errorTabla.set(null);
    const filtros: FiltrosSolicitudes = {
      ...(this.busqueda().trim() ? { busqueda: this.busqueda().trim() } : {}),
      ...(this.producto() ? { producto: this.producto() } : {}),
      ...(this.estado() ? { estado: this.estado() } : {}),
      ...(this.fechaDesde() ? { fechaDesde: this.fechaDesde() } : {}),
      ...(this.fechaHasta() ? { fechaHasta: this.fechaHasta() } : {}),
    };
    this.dashboardService
      .listarSolicitudes(filtros, this.paginaActual() - 1, TAMANO_PAGINA)
      .subscribe({
        next: (pagina) => {
          this.solicitudes.set(pagina.items);
          this.total.set(pagina.total);
          this.cargandoTabla.set(false);
        },
        error: () => {
          this.solicitudes.set([]);
          this.total.set(0);
          this.cargandoTabla.set(false);
          this.errorTabla.set(
            'No pudimos cargar las solicitudes. Intenta de nuevo.',
          );
        },
      });
  }

  /** Formatea un valor como pesos colombianos. */
  protected formatearCop(valor: number): string {
    return formatearCop(valor);
  }
}
