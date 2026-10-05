import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  DataTableComponent,
  EscaleritaLoaderComponent,
  AlertBannerComponent,
  PageHeaderComponent,
  KpiCardComponent,
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

/**
 * RenovacionesComponent — Gestión de Renovaciones (Req 16, 17).
 *
 * Página principal del feature: muestra los KPIs del portafolio (total,
 * renovadas, próximas a renovar, a punto de vencer), un buscador por cédula y
 * el listado de pólizas reutilizando el `DataTableComponent`. Al seleccionar una
 * póliza (fila o acción "Gestionar"), navega al flujo de Renovacion (Req 16.4).
 *
 * Consume `RenovacionService.portafolio()` (mock en dev). La presentación no
 * realiza cálculo autoritativo.
 */
@Component({
  selector: 'app-renovaciones',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    DataTableComponent,
    EscaleritaLoaderComponent,
    AlertBannerComponent,
    PageHeaderComponent,
    KpiCardComponent,
  ],
  templateUrl: './renovaciones.component.html',
  styleUrl: './renovaciones.component.scss',
})
export class RenovacionesComponent {
  private readonly renovacionService = inject(RenovacionService);
  private readonly router = inject(Router);

  /** Portafolio de pólizas y conteos por estado (Req 17). */
  protected readonly portafolio = signal<PortafolioRenovaciones | null>(null);

  /** Indica si el portafolio se está cargando. */
  protected readonly cargando = signal(true);

  /** Mensaje de error genérico de carga. */
  protected readonly error = signal('');

  /** Cédula del cliente para el buscador (Req 16.1). */
  protected readonly cedula = signal('');

  /** Columnas del DataTable de pólizas, con sort, insignia y acción (Req 16.2, 16.3). */
  protected readonly columnas: readonly ColumnaTabla[] = [
    { key: 'numero', header: 'Póliza', ordenable: true },
    { key: 'cliente', header: 'Cliente', ordenable: true },
    { key: 'producto', header: 'Producto', ordenable: true },
    { key: 'fechaVencimiento', header: 'Vencimiento', ordenable: true },
    { key: 'estado', header: 'Estado', tipo: 'badge', ordenable: true },
    { key: 'gestionar', header: '', tipo: 'accion', textoAccion: 'Gestionar', alinear: 'derecha' },
  ];

  /** Filas mapeadas para el DataTable, con la variante de insignia por estado. */
  protected readonly filas = computed(() => {
    const polizas = this.portafolio()?.polizas ?? [];
    return polizas.map((p) => ({
      numero: p.numero,
      cliente: p.cliente,
      producto: p.producto,
      fechaVencimiento: p.fechaVencimiento,
      estado: p.estado,
      estadoVariante: estadoABadge(p.estado).replace('badge-', ''),
      gestionar: '',
    }));
  });

  constructor() {
    this.cargar();
  }

  /** Carga el portafolio de renovaciones desde el backend (Req 17). */
  protected cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.renovacionService.portafolio().subscribe({
      next: (portafolio) => {
        this.portafolio.set(portafolio);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.error.set('No fue posible cargar el portafolio de renovaciones. Intenta nuevamente.');
      },
    });
  }

  /** Inicia el flujo de Renovacion para la póliza seleccionada (Req 16.4). */
  protected onSeleccionFila(indice: number): void {
    const poliza = this.portafolio()?.polizas[indice];
    if (poliza) {
      this.iniciarRenovacion(poliza);
    }
  }

  /** Gestiona la póliza desde el botón de la columna de acción (Req 16.4). */
  protected onGestionar(evento: AccionFila): void {
    this.onSeleccionFila(evento.indice);
  }

  /** Navega al flujo de Renovacion conservando el número de póliza (Req 16.4). */
  private iniciarRenovacion(poliza: Poliza): void {
    void this.router.navigate(['/app/renovaciones/detalle'], {
      queryParams: { numeroPolizaInicial: poliza.numero },
    });
  }
}
