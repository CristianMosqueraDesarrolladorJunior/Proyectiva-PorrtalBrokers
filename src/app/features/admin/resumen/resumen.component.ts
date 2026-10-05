import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ResumenAdminResponse } from '../../../core/models/admin.model';
import { AdminService } from '../../../core/services/admin.service';
import { fechaCorta } from '../../../core/services/admin.helpers';
import { SessionService } from '../../../core/services/session.service';
import {
  IconComponent,
  KpiCardComponent,
  PageHeaderComponent,
} from '../../../shared/components';
import type { TonoKpiCard } from '../../../shared/components';

/**
 * Resumen de la consola (Req 16): KPIs, radicados por comercial y actividad
 * reciente, tal como los entrega el API_Backend (`AdminService`). No hay
 * cálculos ni agregaciones en el cliente.
 */
@Component({
  selector: 'app-admin-resumen',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, KpiCardComponent, IconComponent],
  templateUrl: './resumen.component.html',
  styleUrls: ['../admin-comun.scss', './resumen.component.scss'],
})
export class ResumenComponent {
  private readonly admin = inject(AdminService);
  private readonly session = inject(SessionService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly esAdmin = this.admin.esAdmin();
  protected readonly perfil = this.session.perfil;

  // --- Estado de carga ---
  protected readonly resumen = signal<ResumenAdminResponse | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal(false);

  protected readonly fechaCorta = fechaCorta;

  constructor() {
    this.cargarResumen();
  }

  /** Máximo de radicados para dimensionar las barras (mínimo 1). */
  protected maxRadicados(): number {
    const r = this.resumen();
    if (!r) return 1;
    return Math.max(1, ...r.radicadosPorComercial.map((x) => x.radicados));
  }

  /** Tono de la tarjeta de KPI según su bandera de alerta. */
  protected tonoKpi(alerta: boolean): TonoKpiCard {
    return alerta ? 'danger' : 'none';
  }

  /** Obtiene el resumen de administración desde el backend. */
  private cargarResumen(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.admin
      .obtenerResumen()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resumen) => {
          this.resumen.set(resumen);
          this.cargando.set(false);
        },
        error: () => {
          this.resumen.set(null);
          this.cargando.set(false);
          this.error.set(true);
        },
      });
  }
}
