import { CatalogoService } from '../../../../core/services/catalogo.service';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';

import {
  BarraAccionesComponent,
  BotonComponent,
  DataTableComponent,
  EstadoVistaComponent,
  FormFieldComponent,
  GridLayoutComponent,
  KpiCardComponent,
  PageHeaderComponent,
} from '../../../../shared/components';
import type {
  AccionFila,
  ColumnaTabla,
} from '../../../../shared/components';
import {
  RenovacionService,
  type PortafolioRenovaciones,
} from '../../../../core/services/renovacion.service';
import type { Poliza } from '../../../../core/models/poliza.model';
import { estadoABadge } from '../../../../shared/pipes/estado-badge';
import { esPolizaVencida } from '../../induccion-habilitacion';
import { accionRenovacion, ordenarPorUrgencia } from '../../renovaciones-lista';


/**
 * RenovacionesComponent — Gestión de Renovaciones (Req 16, 17).
 *
 * Página principal del feature: muestra los KPIs del portafolio (total,
 * renovadas, próximas a renovar, a punto de vencer), un buscador por cédula y
 * el listado de pólizas reutilizando el `DataTableComponent`. Al seleccionar una
 * póliza (fila o acción "Gestionar"), navega al flujo de Renovacion (Req 16.4).
 *
 * Consume `RenovacionService.portafolio()` (API real). La presentación no
 * realiza cálculo autoritativo.
 */
@Component({
  selector: 'app-renovaciones',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BarraAccionesComponent,
    BotonComponent,
    DataTableComponent,
    EstadoVistaComponent,
    FormFieldComponent,
    GridLayoutComponent,
    KpiCardComponent,
    PageHeaderComponent,
  ],
  templateUrl: './renovaciones.component.html',
  styleUrl: './renovaciones.component.scss',
})
export class RenovacionesComponent {
  private readonly catalogo = inject(CatalogoService);
  private readonly renovacionService = inject(RenovacionService);
  private readonly router = inject(Router);

  /** Portafolio de pólizas y conteos por estado (Req 17). */
  protected readonly portafolio = signal<PortafolioRenovaciones | null>(null);

  /** Indica si el portafolio se está cargando. */
  protected readonly cargando = signal(true);

  /** Falló la carga del portafolio (la vista ofrece reintentar). */
  protected readonly error = signal(false);

  /** Texto del buscador: filtra por número de póliza en el portafolio cargado. */
  protected readonly busqueda = signal('');

  /** Filtro por vigencia de la póliza (`estado_poliza` del catálogo); vacío = todas. */
  protected readonly estadoFiltro = signal('');
  protected readonly estados = this.catalogo.opciones('estado_poliza');

  /** Pólizas que coinciden con la búsqueda y el filtro, de la más urgente a la menos urgente. */
  private readonly polizasVisibles = computed(() => {
    const polizas = this.portafolio()?.polizas ?? [];
    const q = this.busqueda().trim().toLowerCase();
    const estado = this.estadoFiltro();
    return ordenarPorUrgencia(
      polizas.filter((p) => (!q || p.numero.toLowerCase().includes(q)) && (!estado || p.estado === estado)),
    );
  });

  protected readonly hayFiltros = computed(() => !!this.busqueda().trim() || !!this.estadoFiltro());

  protected limpiarFiltros(): void {
    this.busqueda.set('');
    this.estadoFiltro.set('');
  }

  /** Columnas del DataTable de pólizas, con sort, insignia y acción (Req 16.2, 16.3). */
  protected readonly columnas: readonly ColumnaTabla[] = [
    { key: 'numero', header: 'Póliza', ordenable: true },
    { key: 'producto', header: 'Producto', ordenable: true },
    { key: 'fechaVencimiento', header: 'Vencimiento', ordenable: true },
    { key: 'estado', header: 'Vigencia', tipo: 'badge', ordenable: true },
    { key: 'gestion', header: 'Estado de la gestión', tipo: 'principal', ordenable: true },
    { key: 'gestionar', header: '', tipo: 'accion', textoAccion: 'Renovar', alinear: 'derecha' },
  ];

  /** Filas mapeadas para el DataTable, con la variante de insignia por estado. */
  protected readonly filas = computed(() => {
    const polizas = this.polizasVisibles();
    return polizas.map((p) => ({
      numero: p.numero,
      producto: p.producto,
      fechaVencimiento: p.fechaVencimiento,
      estado: this.catalogo.etiqueta('estado_poliza', p.estado),
      estadoVariante: esPolizaVencida(p)
        ? 'danger'
        : estadoABadge(this.catalogo.etiqueta('estado_poliza', p.estado)).replace('badge-', ''),
      gestion: p.gestion ?? 'Sin gestión aún',
      gestionSub: p.estadoWarehouse ?? '',
      gestionar: '',
      gestionarTexto: accionRenovacion(p),
    }));
  });

  constructor() {
    this.cargar();
  }

  /** Carga el portafolio de renovaciones desde el backend (Req 17). */
  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.renovacionService.portafolio().subscribe({
      next: (portafolio) => {
        this.portafolio.set(portafolio);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.error.set(true);
      },
    });
  }

  /** Inicia el flujo de Renovacion para la póliza seleccionada (Req 16.4). */
  protected onSeleccionFila(indice: number): void {
    const poliza = this.polizasVisibles()[indice];
    if (poliza) {
      this.iniciarRenovacion(poliza);
    }
  }

  /** Gestiona la póliza desde el botón de la columna de acción (Req 16.4). */
  protected onGestionar(evento: AccionFila): void {
    this.onSeleccionFila(evento.indice);
  }

  /**
   * Navega al flujo de Renovacion conservando el número de póliza (Req 16.4). Una póliza vencida
   * ya no se renueva: va a la inducción.
   */
  private iniciarRenovacion(poliza: Poliza): void {
    if (esPolizaVencida(poliza)) {
      void this.router.navigate(['/app/renovaciones/induccion'], { queryParams: { poliza: poliza.numero } });
      return;
    }
    void this.router.navigate(['/app/renovaciones/detalle'], {
      queryParams: { numeroPolizaInicial: poliza.numero },
    });
  }

  /** Estado vacío: el primer paso para tener pólizas es cotizar. */
  protected irACotizar(): void {
    void this.router.navigate(['/app/cotizador']);
  }
}
