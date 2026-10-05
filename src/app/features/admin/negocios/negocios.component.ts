import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { ESTADOS_NEGOCIO, Negocio } from '../../../core/models/admin.model';
import { AdminService } from '../../../core/services/admin.service';
import { cop, fechaCorta } from '../../../core/services/admin.helpers';
import {
  BadgeEstadoComponent,
  DrawerDetalleComponent,
  PageHeaderComponent,
} from '../../../shared/components';
import { estadoCorto, varianteEstado } from '../admin-vista';

const TAMANO_PAGINA = 20;

type NegocioFila = Negocio & { readonly brokerNombre: string; readonly comercialNombre: string };

/** Negocios (solicitudes radicadas) de la cartera visible, con su estado documental. */
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

  protected readonly esAdmin = this.admin.esAdmin;
  protected readonly estadosDisponibles = ESTADOS_NEGOCIO;
  protected readonly comerciales = this.admin.comerciales;

  protected readonly busqueda = signal('');
  protected readonly estado = signal('');
  protected readonly comercialId = signal('');
  protected readonly brokerId = signal('');
  protected readonly desde = signal('');
  protected readonly hasta = signal('');
  protected readonly pagina = signal(1);

  protected readonly resultado = computed(() =>
    this.admin.listarNegocios(
      {
        busqueda: this.busqueda(),
        estado: this.estado(),
        comercialId: this.comercialId(),
        brokerId: this.brokerId(),
        desde: this.desde(),
        hasta: this.hasta(),
      },
      this.pagina(),
      TAMANO_PAGINA,
    ),
  );
  protected readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.resultado().total / TAMANO_PAGINA)));
  protected readonly nombreBrokerFiltro = computed(() => {
    const id = this.brokerId();
    return id ? this.admin.brokersVisibles().find((b) => b.id === id)?.nombre ?? id : '';
  });

  protected readonly detalle = signal<NegocioFila | null>(null);
  protected readonly filasDetalle = computed(() => {
    const n = this.detalle();
    if (!n) return [];
    return [
      { etiqueta: 'Estado', valor: n.estado },
      { etiqueta: 'Broker', valor: `${n.brokerNombre} (${n.brokerId})` },
      { etiqueta: 'Comercial', valor: n.comercialNombre },
      { etiqueta: 'Fecha de radicación', valor: fechaCorta(n.fecha) },
      { etiqueta: 'Destino', valor: n.destino || '—' },
      { etiqueta: 'Ciudad', valor: n.ciudad || '—' },
      { etiqueta: 'Valor asegurado (mensual)', valor: cop(n.valorAsegurado) },
      { etiqueta: 'Valor total póliza', valor: cop(n.valorPoliza) },
      { etiqueta: 'N.º de póliza', valor: n.poliza || 'Aún sin expedir' },
      { etiqueta: 'Asesor documental', valor: n.asesor || '—' },
      { etiqueta: 'Última gestión', valor: fechaCorta(n.ultimaGestion) },
      { etiqueta: 'Horas de gestión', valor: String(n.horasGestion) },
    ];
  });

  protected readonly cop = cop;
  protected readonly fechaCorta = fechaCorta;
  protected readonly varianteEstado = varianteEstado;
  protected readonly estadoCorto = estadoCorto;

  constructor() {
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((q) => {
        this.busqueda.set(q.get('q') ?? '');
        this.brokerId.set(q.get('broker') ?? '');
        this.estado.set(q.get('estado') ?? '');
        this.pagina.set(1);
      });
  }

  protected num(n: number): string {
    return n.toLocaleString('es-CO');
  }

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement).value;
  }

  /** Tras cambiar un filtro, vuelve a la primera página. */
  protected filtrar(): void {
    this.pagina.set(1);
  }

  protected irPagina(p: number): void {
    this.pagina.set(Math.min(Math.max(1, p), this.totalPaginas()));
  }

  protected limpiar(): void {
    this.busqueda.set('');
    this.estado.set('');
    this.comercialId.set('');
    this.brokerId.set('');
    this.desde.set('');
    this.hasta.set('');
    this.pagina.set(1);
  }
}
