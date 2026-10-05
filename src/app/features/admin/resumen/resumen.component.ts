import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AdminService } from '../../../core/services/admin.service';
import { copCompacto, etiquetaMes, fechaCorta, pendientes } from '../../../core/services/admin.helpers';
import { SessionService } from '../../../core/services/session.service';
import {
  BadgeEstadoComponent,
  IconComponent,
  KpiCardComponent,
  PageHeaderComponent,
} from '../../../shared/components';
import { estadoCorto, varianteEstado } from '../admin-vista';

/**
 * Resumen de la consola: KPIs, estado documental, radicaciones por mes,
 * comparativo por comercial (solo admin) y negocios pendientes con más horas.
 */
@Component({
  selector: 'app-admin-resumen',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, KpiCardComponent, BadgeEstadoComponent, IconComponent],
  templateUrl: './resumen.component.html',
  styleUrls: ['../admin-comun.scss', './resumen.component.scss'],
})
export class ResumenComponent {
  private readonly admin = inject(AdminService);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);

  protected readonly esAdmin = this.admin.esAdmin;
  protected readonly perfil = this.session.perfil;
  protected readonly resumen = computed(() => this.admin.resumen());
  protected readonly comerciales = computed(() => this.admin.comercialesResumen());

  protected readonly maxMes = computed(() => Math.max(1, ...this.resumen().porMes.map((m) => m.negocios)));

  protected readonly estados = computed(() => {
    const i = this.resumen().indicadores;
    const total = Math.max(1, i.negocios);
    return [
      { etiqueta: 'Expedido', valor: i.expedidos, clase: 'ok' },
      { etiqueta: 'Pendiente Validación Documental', valor: i.pendientesValidacion, clase: 'info' },
      { etiqueta: 'Pendiente Corrección Documental', valor: i.pendientesCorreccion, clase: 'warn' },
      { etiqueta: 'Desistido', valor: i.desistidos, clase: 'ko' },
    ].map((e) => ({ ...e, pct: (e.valor / total) * 100 }));
  });

  protected readonly copCompacto = copCompacto;
  protected readonly fechaCorta = fechaCorta;
  protected readonly etiquetaMes = etiquetaMes;
  protected readonly pendientes = pendientes;
  protected readonly varianteEstado = varianteEstado;
  protected readonly estadoCorto = estadoCorto;

  protected num(n: number): string {
    return n.toLocaleString('es-CO');
  }

  protected pct(parte: number, total: number): string {
    return total ? `${Math.round((parte / total) * 100)}%` : '—';
  }

  protected verBrokersDe(comercialId: string): void {
    void this.router.navigate(['/admin/brokers'], { queryParams: { comercial: comercialId } });
  }

  protected verNegocio(codigo: string): void {
    void this.router.navigate(['/admin/negocios'], { queryParams: { q: codigo } });
  }

  protected verPendientes(): void {
    void this.router.navigate(['/admin/brokers'], { queryParams: { pendientes: 1 } });
  }
}
