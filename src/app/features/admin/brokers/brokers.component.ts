import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { BrokerAdminResponse, ComercialResponse } from '../../../core/models/admin.model';
import { AdminService } from '../../../core/services/admin.service';
import {
  BadgeEstadoComponent,
  DrawerDetalleComponent,
  IconComponent,
  ModalDialogComponent,
  PageHeaderComponent,
} from '../../../shared/components';
import type { FilaDetalle, VarianteBadge } from '../../../shared/components';

/**
 * Brokers de la cartera visible (Req 16). El Administrador ve todos y puede
 * reasignar un broker a un comercial; el Comercial ve solo los suyos.
 *
 * Toda la información proviene del API_Backend de forma asíncrona
 * (`AdminService`). La búsqueda se envía al servidor como parámetro (no se
 * filtra en el cliente). Solo se presentan los campos del `BrokerAdminResponse`.
 */
@Component({
  selector: 'app-admin-brokers',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, BadgeEstadoComponent, DrawerDetalleComponent, ModalDialogComponent, IconComponent],
  templateUrl: './brokers.component.html',
  styleUrls: ['../admin-comun.scss', './brokers.component.scss'],
})
export class BrokersComponent {
  private readonly admin = inject(AdminService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly esAdmin = this.admin.esAdmin();

  // --- Estado de carga de brokers ---
  protected readonly brokers = signal<readonly BrokerAdminResponse[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal(false);

  // --- Comerciales activos para el selector de reasignación ---
  protected readonly comerciales = signal<readonly ComercialResponse[]>([]);

  // --- Búsqueda (se envía al backend) ---
  protected readonly busqueda = signal('');

  // --- Detalle (drawer) ---
  protected readonly detalle = signal<BrokerAdminResponse | null>(null);

  // --- Reasignación ---
  protected readonly brokerAReasignar = signal<BrokerAdminResponse | null>(null);
  protected readonly comercialDestino = signal('');
  protected readonly guardandoReasignacion = signal(false);
  protected readonly errorReasignacion = signal(false);
  protected readonly mensaje = signal('');

  constructor() {
    this.cargarBrokers();
    if (this.esAdmin) {
      this.cargarComerciales();
    }
  }

  /** Lee el texto de un input/select. */
  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement).value;
  }

  /** Filas de detalle del broker seleccionado (solo campos del backend). */
  protected filasDetalle(): readonly FilaDetalle[] {
    const b = this.detalle();
    if (!b) return [];
    return [
      { etiqueta: 'Identificación', valor: b.brokerId },
      { etiqueta: 'Tipo', valor: b.tipo },
      { etiqueta: 'Comercial', valor: b.comercial },
      { etiqueta: 'Negocios', valor: String(b.numeroNegocios) },
      { etiqueta: 'SARLAFT', valor: this.etiquetaSarlaft(b.estadoSarlaft) },
      { etiqueta: 'Estado', valor: b.estado },
    ];
  }

  /** Dispara la búsqueda contra el backend. */
  protected buscar(termino: string): void {
    this.busqueda.set(termino);
    this.cargarBrokers();
  }

  protected abrirDetalle(b: BrokerAdminResponse): void {
    this.detalle.set(b);
  }

  protected abrirReasignar(b: BrokerAdminResponse): void {
    this.brokerAReasignar.set(b);
    this.comercialDestino.set('');
    this.errorReasignacion.set(false);
  }

  protected cerrarReasignar(): void {
    this.brokerAReasignar.set(null);
  }

  /** Confirma la reasignación de un broker al comercial destino (Req 16.3). */
  protected confirmarReasignar(): void {
    const broker = this.brokerAReasignar();
    const destino = this.comercialDestino();
    if (!broker || !destino) return;
    this.guardandoReasignacion.set(true);
    this.errorReasignacion.set(false);
    this.admin
      .asignarComercial(broker.brokerId, destino)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (actualizado) => {
          this.guardandoReasignacion.set(false);
          this.brokerAReasignar.set(null);
          this.mensaje.set(`Broker ${actualizado.broker} reasignado a ${actualizado.comercial}.`);
          this.cargarBrokers();
        },
        error: () => {
          this.guardandoReasignacion.set(false);
          this.errorReasignacion.set(true);
        },
      });
  }

  /** Variante de badge para el estado SARLAFT (`ok` / `rev` / `pend`). */
  protected varianteSarlaft(estado: string): VarianteBadge {
    switch (estado) {
      case 'ok':
        return 'success';
      case 'rev':
        return 'warning';
      case 'pend':
        return 'danger';
      default:
        return 'info';
    }
  }

  /** Etiqueta legible del estado SARLAFT. */
  protected etiquetaSarlaft(estado: string): string {
    switch (estado) {
      case 'ok':
        return 'Aprobado';
      case 'rev':
        return 'En revisión';
      case 'pend':
        return 'Pendiente';
      default:
        return estado;
    }
  }

  /** Variante de badge para el estado del broker. */
  protected varianteEstado(estado: string): VarianteBadge {
    switch (estado) {
      case 'Activo':
        return 'success';
      case 'En registro':
        return 'warning';
      case 'Inactivo':
        return 'danger';
      default:
        return 'info';
    }
  }

  /** Obtiene los brokers visibles (con el término de búsqueda al backend). */
  private cargarBrokers(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.admin
      .listarBrokers(this.busqueda())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (brokers) => {
          this.brokers.set(brokers);
          this.cargando.set(false);
        },
        error: () => {
          this.brokers.set([]);
          this.cargando.set(false);
          this.error.set(true);
        },
      });
  }

  /** Obtiene los comerciales activos para el selector de reasignación. */
  private cargarComerciales(): void {
    this.admin
      .listarComerciales()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (comerciales) => this.comerciales.set(comerciales.filter((c) => c.activo)),
        error: () => this.comerciales.set([]),
      });
  }
}
