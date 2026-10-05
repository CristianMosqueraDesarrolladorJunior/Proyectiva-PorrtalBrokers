import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ETAPAS_NEGOCIO, NegocioAdminResponse } from '../../../core/models/admin.model';
import { AdminService } from '../../../core/services/admin.service';
import { cop, fechaCorta } from '../../../core/services/admin.helpers';
import {
  BadgeEstadoComponent,
  DrawerDetalleComponent,
  PageHeaderComponent,
} from '../../../shared/components';
import type { FilaDetalle, VarianteBadge } from '../../../shared/components';

/**
 * Negocios (solicitudes radicadas) de la cartera visible, con su etapa (Req 16).
 *
 * La información proviene del API_Backend de forma asíncrona (`AdminService`).
 * El filtro de etapa se envía al servidor como parámetro (no se filtra en el
 * cliente). Solo se presentan los campos del `NegocioAdminResponse`.
 */
@Component({
  selector: 'app-admin-negocios',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, BadgeEstadoComponent, DrawerDetalleComponent],
  templateUrl: './negocios.component.html',
  styleUrls: ['../admin-comun.scss'],
})
export class NegociosComponent {
  private readonly admin = inject(AdminService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly esAdmin = this.admin.esAdmin();
  protected readonly etapasDisponibles = ETAPAS_NEGOCIO;

  // --- Estado de carga ---
  protected readonly negocios = signal<readonly NegocioAdminResponse[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal(false);

  // --- Filtro de etapa (se envía al backend) ---
  protected readonly etapa = signal('');

  // --- Detalle (drawer) ---
  protected readonly detalle = signal<NegocioAdminResponse | null>(null);

  protected readonly cop = cop;
  protected readonly fechaCorta = fechaCorta;

  constructor() {
    this.cargarNegocios();
  }

  /** Lee el texto de un input/select. */
  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement).value;
  }

  /** Aplica el filtro de etapa recargando desde el backend. */
  protected filtrarEtapa(etapa: string): void {
    this.etapa.set(etapa);
    this.cargarNegocios();
  }

  /** Filas de detalle del negocio seleccionado (solo campos del backend). */
  protected filasDetalle(): readonly FilaDetalle[] {
    const n = this.detalle();
    if (!n) return [];
    return [
      { etiqueta: 'Radicado', valor: n.radicado },
      { etiqueta: 'Inquilino', valor: n.inquilino },
      { etiqueta: 'Broker', valor: n.broker },
      { etiqueta: 'Valor asegurado', valor: cop(n.valorAsegurado) },
      { etiqueta: 'Etapa', valor: n.etapa },
      { etiqueta: 'Fecha', valor: fechaCorta(n.fecha) },
    ];
  }

  /** Variante de badge para la etapa del negocio. */
  protected varianteEtapa(etapa: string): VarianteBadge {
    switch (etapa) {
      case 'Emitida':
        return 'success';
      case 'Radicado':
        return 'info';
      case 'SARLAFT':
      case 'Documentos':
        return 'warning';
      default:
        return 'info';
    }
  }

  /** Obtiene los negocios visibles (con el filtro de etapa al backend). */
  private cargarNegocios(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.admin
      .listarNegocios(this.etapa())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (negocios) => {
          this.negocios.set(negocios);
          this.cargando.set(false);
        },
        error: () => {
          this.negocios.set([]);
          this.cargando.set(false);
          this.error.set(true);
        },
      });
  }
}
