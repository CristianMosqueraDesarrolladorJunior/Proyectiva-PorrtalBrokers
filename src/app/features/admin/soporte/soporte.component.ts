import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';

import { AdminService } from '../../../core/services/admin.service';
import { fechaHora } from '../../../core/services/admin.helpers';
import { SoporteService, areasTexto, duracionTexto, vencida } from '../../../core/services/soporte.service';
import type { EstadoSoporte, SolicitudSoporte } from '../../../core/services/soporte.service';
import {
  DataTableComponent,
  EstadoVistaComponent,
  GridLayoutComponent,
  KpiCardComponent,
  PageHeaderComponent,
} from '../../../shared/components';
import type { AccionFila, ColumnaTabla, FilaTabla } from '../../../shared/components';
import { FilterTab, FilterTabsComponent } from '../../../shared/components/filter-tabs/filter-tabs.component';
import { FeedbackService } from '../../../shared/services/feedback/feedback.service';

/** Bandeja de soporte a brokers: estado Pendiente/Solventado y temporizador contra la meta de atención. */
@Component({
  selector: 'app-admin-soporte',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataTableComponent, EstadoVistaComponent, FilterTabsComponent, GridLayoutComponent, KpiCardComponent, PageHeaderComponent],
  templateUrl: './soporte.component.html',
  styleUrls: ['../admin-comun.scss'],
})
export class SoporteAdminComponent implements OnInit {
  private readonly soporte = inject(SoporteService);
  private readonly feedback = inject(FeedbackService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly esAdmin = inject(AdminService).esAdmin();

  protected readonly solicitudes = signal<readonly SolicitudSoporte[]>([]);
  protected readonly metaHoras = signal(24);
  protected readonly cargando = signal(true);
  protected readonly error = signal(false);
  protected readonly filtro = signal<'PENDIENTE' | 'SOLVENTADO' | 'TODAS'>('PENDIENTE');
  /** Reloj del temporizador: un solo intervalo por vista, cada minuto. */
  private readonly ahora = signal(Date.now());

  protected readonly pestanas: FilterTab[] = [
    { id: 'PENDIENTE', label: 'Pendientes' },
    { id: 'SOLVENTADO', label: 'Solventadas' },
    { id: 'TODAS', label: 'Todas' },
  ];

  protected readonly columnas: readonly ColumnaTabla[] = [
    { key: 'ticket', header: 'Ticket', tipo: 'principal', ordenable: true, nowrap: true },
    { key: 'broker', header: 'Broker', tipo: 'principal', ordenable: true },
    { key: 'telefono', header: 'Contacto', tipo: 'principal', nowrap: true },
    { key: 'areas', header: 'Sobre', tipo: 'principal' },
    { key: 'asunto', header: 'Asunto y observación', tipo: 'principal' },
    { key: 'estado', header: 'Estado', tipo: 'badge', ordenable: true },
    { key: 'tiempo', header: 'Tiempo', tipo: 'badge', nowrap: true },
    { key: 'gestionar', header: '', tipo: 'accion', textoAccion: 'Cambiar estado' },
  ];


  private readonly visibles = computed(() =>
    this.solicitudes().filter((s) => this.filtro() === 'TODAS' || s.estado === this.filtro()),
  );

  protected readonly pendientes = computed(() => this.solicitudes().filter((s) => s.estado === 'PENDIENTE').length);
  protected readonly vencidas = computed(
    () => this.solicitudes().filter((s) => vencida(s, this.ahora(), this.metaHoras())).length,
  );

  protected readonly filas = computed<readonly FilaTabla[]>(() =>
    this.visibles().map((s) => {
      const fuera = vencida(s, this.ahora(), this.metaHoras());
      return {
        ticket: s.ticket,
        ticketSub: fechaHora(s.creadoEn),
        broker: s.brokerNombre,
        brokerSub: s.brokerDocumento + (s.estadoCuenta === 'PROSPECTO' ? ' · Prospecto' : ''),
        telefono: s.brokerTelefono ?? '—',
        telefonoSub: s.brokerCorreo ?? '',
        areas: areasTexto(s.areas),
        areasSub: s.tipo === 'PREVENTIVO' ? 'Preventivo' : 'Correctivo',
        asunto: s.asunto,
        asuntoSub: s.observacion.length > 90 ? s.observacion.slice(0, 90) + '…' : s.observacion,
        estado: s.estado === 'PENDIENTE' ? 'Pendiente' : 'Solventado',
        estadoVariante: s.estado === 'PENDIENTE' ? 'warning' : 'success',
        // Solventadas congelan el tiempo en el instante en que se cerraron.
        tiempo: duracionTexto(s.creadoEn, s.solventadoEn ?? this.ahora()),
        tiempoVariante: s.estado === 'SOLVENTADO' ? 'success' : fuera ? 'danger' : 'info',
        gestionar: 'x',
      };
    }),
  );

  ngOnInit(): void {
    this.cargar();
    const id = setInterval(() => this.ahora.set(Date.now()), 60_000);
    this.destroyRef.onDestroy(() => clearInterval(id));
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.soporte.consola().subscribe({
      next: (r) => {
        this.solicitudes.set(r.solicitudes);
        this.metaHoras.set(r.metaHoras);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set(true);
        this.cargando.set(false);
      },
    });
  }

  protected elegirFiltro(id: string): void {
    this.filtro.set(id as 'PENDIENTE' | 'SOLVENTADO' | 'TODAS');
  }

  protected alternar(evento: AccionFila): void {
    const s = this.visibles()[evento.indice];
    if (!s) return;
    const nuevo: EstadoSoporte = s.estado === 'PENDIENTE' ? 'SOLVENTADO' : 'PENDIENTE';
    this.soporte.cambiarEstado(s.ticket, nuevo).subscribe({
      next: (r) => {
        this.solicitudes.update((lista) => lista.map((x) => (x.ticket === r.ticket ? r : x)));
        this.feedback.exito({ titulo: 'Estado actualizado', mensaje: `${r.ticket} quedó ${nuevo === 'SOLVENTADO' ? 'solventado' : 'pendiente'}.` });
      },
      error: () => this.feedback.error({ titulo: 'No se pudo actualizar', mensaje: 'Intenta de nuevo en un momento.' }),
    });
  }
}
