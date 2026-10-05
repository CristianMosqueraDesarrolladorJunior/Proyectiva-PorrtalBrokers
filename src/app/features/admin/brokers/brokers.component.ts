import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { BrokerResumen } from '../../../core/models/admin.model';
import { ETIQUETA_ESTADO_CUENTA, type EstadoCuenta } from '../../../core/models/cuenta.model';
import { AdminService } from '../../../core/services/admin.service';
import { copCompacto, cop, fechaCorta, pendientes } from '../../../core/services/admin.helpers';
import {
  BadgeEstadoComponent,
  DrawerDetalleComponent,
  IconComponent,
  ModalDialogComponent,
  PageHeaderComponent,
} from '../../../shared/components';
import { estadoCorto, varianteEstado } from '../admin-vista';

const TAMANO_PAGINA = 15;

/**
 * Brokers de la cartera visible: el Administrador ve todos y puede reasignar
 * (uno o varios); el Comercial ve solo los suyos.
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
  private readonly router = inject(Router);

  protected readonly esAdmin = this.admin.esAdmin;
  protected readonly comerciales = computed(() => this.admin.comerciales().filter((c) => c.activo));

  // Filtros
  protected readonly busqueda = signal('');
  protected readonly comercialId = signal('');
  protected readonly tipo = signal<'' | 'Broker' | 'Inmobiliaria'>('');
  protected readonly estadoCuenta = signal<'' | EstadoCuenta>('');
  protected readonly etiquetaEstadoCuenta = ETIQUETA_ESTADO_CUENTA;
  protected readonly soloPendientes = signal(false);
  protected readonly pagina = signal(1);

  protected readonly resultado = computed(() =>
    this.admin.listarBrokers(
      {
        busqueda: this.busqueda(),
        comercialId: this.comercialId(),
        tipo: this.tipo(),
        estadoCuenta: this.estadoCuenta(),
        soloConPendientes: this.soloPendientes(),
      },
      this.pagina(),
      TAMANO_PAGINA,
    ),
  );
  protected readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.resultado().total / TAMANO_PAGINA)));

  // Selección y detalle
  protected readonly seleccionados = signal<ReadonlySet<string>>(new Set());
  protected readonly detalleId = signal<string | null>(null);
  protected readonly detalle = computed(() => {
    const id = this.detalleId();
    return id ? this.admin.brokersVisibles().find((b) => b.id === id) ?? null : null;
  });
  protected readonly negociosDetalle = computed(() => {
    const id = this.detalleId();
    return id ? this.admin.negociosDeBroker(id) : [];
  });
  protected readonly filasDetalle = computed(() => {
    const b = this.detalle();
    if (!b) return [];
    return [
      { etiqueta: 'Identificación', valor: b.id },
      { etiqueta: 'Tipo', valor: b.tipo },
      { etiqueta: 'Estado de la cuenta', valor: ETIQUETA_ESTADO_CUENTA[b.estadoCuenta] },
      { etiqueta: 'Documentación', valor: `${b.documentosAportados} de 4 documentos aportados` },
      { etiqueta: 'Comercial', valor: b.comercialNombre },
      { etiqueta: 'Celular', valor: b.celular || '—' },
      { etiqueta: 'Correo', valor: b.correo || '—' },
      { etiqueta: 'Negocios', valor: `${b.negocios} (${b.expedidos} expedidos)` },
      { etiqueta: 'Pendientes', valor: `${b.pendientesCorreccion} corrección · ${b.pendientesValidacion} validación` },
      { etiqueta: 'Prima expedida', valor: cop(b.primaExpedida) },
      { etiqueta: 'Última radicación', valor: fechaCorta(b.ultimaRadicacion) },
    ];
  });

  // Reasignación
  protected readonly modalReasignar = signal(false);
  protected readonly destino = signal('');
  protected readonly idsAReasignar = signal<readonly string[]>([]);
  protected readonly mensaje = signal('');

  protected readonly copCompacto = copCompacto;
  protected readonly fechaCorta = fechaCorta;
  protected readonly pendientes = pendientes;
  protected readonly varianteEstado = varianteEstado;
  protected readonly estadoCorto = estadoCorto;

  constructor() {
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((q) => {
        this.comercialId.set(q.get('comercial') ?? '');
        this.soloPendientes.set(q.get('pendientes') === '1');
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

  protected alternarSeleccion(id: string, evento: Event): void {
    evento.stopPropagation();
    this.seleccionados.update((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  protected seleccionarPagina(evento: Event): void {
    const marcar = (evento.target as HTMLInputElement).checked;
    this.seleccionados.update((s) => {
      const n = new Set(s);
      for (const b of this.resultado().items) {
        if (marcar) n.add(b.id);
        else n.delete(b.id);
      }
      return n;
    });
  }

  protected paginaSeleccionada(): boolean {
    const items = this.resultado().items;
    return items.length > 0 && items.every((b) => this.seleccionados().has(b.id));
  }

  protected abrirDetalle(b: BrokerResumen): void {
    this.detalleId.set(b.id);
  }

  protected abrirReasignar(ids: readonly string[]): void {
    this.idsAReasignar.set(ids);
    this.destino.set('');
    this.modalReasignar.set(true);
  }

  protected reasignarSeleccionados(): void {
    this.abrirReasignar([...this.seleccionados()]);
  }

  protected confirmarReasignar(): void {
    const destino = this.destino();
    if (!destino) return;
    const n = this.admin.reasignar(this.idsAReasignar(), destino);
    const nombre = this.comerciales().find((c) => c.id === destino)?.nombre ?? destino;
    this.mensaje.set(`${n} broker${n === 1 ? '' : 's'} reasignado${n === 1 ? '' : 's'} a ${nombre}.`);
    this.modalReasignar.set(false);
    this.seleccionados.set(new Set());
  }

  protected verNegocios(brokerId: string): void {
    void this.router.navigate(['/admin/negocios'], { queryParams: { broker: brokerId } });
  }
}
