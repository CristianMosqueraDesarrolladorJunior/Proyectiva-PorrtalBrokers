import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { AdminService } from '../../../core/services/admin.service';
import { fechaHora } from '../../../core/services/admin.helpers';
import { SoporteService, areasTexto, duracionTexto, vencida } from '../../../core/services/soporte.service';
import type { EstadoSoporte, SolicitudSoporte } from '../../../core/services/soporte.service';
import {
  BadgeEstadoComponent,
  DataTableComponent,
  EstadoVistaComponent,
  FichaComponent,
  GridLayoutComponent,
  KpiCardComponent,
  ModalDialogComponent,
  PageHeaderComponent,
} from '../../../shared/components';
import type { AccionFila, ColumnaTabla, FilaTabla, SeccionFicha } from '../../../shared/components';
import { FilterTab, FilterTabsComponent } from '../../../shared/components/filter-tabs/filter-tabs.component';
import { FeedbackService } from '../../../shared/services/feedback/feedback.service';

/** Bandeja de soporte a brokers: estado Pendiente/Solventado y temporizador contra la meta de atención. */
@Component({
  selector: 'app-admin-soporte',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeEstadoComponent,
    DataTableComponent,
    EstadoVistaComponent,
    FichaComponent,
    FilterTabsComponent,
    GridLayoutComponent,
    KpiCardComponent,
    ModalDialogComponent,
    PageHeaderComponent,
  ],
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
    { key: 'ver', header: '', tipo: 'accion', textoAccion: 'Ver' },
    { key: 'gestionar', header: '', tipo: 'accion', textoAccion: 'Cambiar estado' },
  ];

  /** Solicitud abierta en el detalle («Ver»). */
  protected readonly detalle = signal<SolicitudSoporte | null>(null);
  protected readonly ficha = computed<readonly SeccionFicha[]>(() => {
    const s = this.detalle();
    if (!s) return [];
    return [
      {
        titulo: 'Solicitud',
        icono: 'support_agent',
        datos: [
          { etiqueta: 'Ticket', valor: s.ticket },
          { etiqueta: 'Creada', valor: fechaHora(s.creadoEn) },
          { etiqueta: 'Tipo', valor: s.tipo === 'PREVENTIVO' ? 'Preventivo' : 'Correctivo' },
          { etiqueta: 'Sobre', valor: areasTexto(s.areas) },
          { etiqueta: 'Asunto', valor: s.asunto, ancho: true },
          { etiqueta: 'Observación', valor: s.observacion, ancho: true },
        ],
      },
      {
        titulo: 'Broker',
        icono: 'person',
        datos: [
          { etiqueta: 'Nombre', valor: s.brokerNombre },
          { etiqueta: 'Cédula', valor: s.brokerDocumento },
          { etiqueta: 'Cuenta', valor: s.estadoCuenta === 'PROSPECTO' ? 'Prospecto' : 'Registrado' },
          { etiqueta: 'Teléfono', valor: s.brokerTelefono },
          { etiqueta: 'Correo', valor: s.brokerCorreo },
        ],
      },
      {
        titulo: 'Atención',
        icono: 'timer',
        datos: [
          { etiqueta: 'Estado', valor: s.estado === 'PENDIENTE' ? 'Pendiente' : 'Solventado' },
          { etiqueta: 'Tiempo', valor: duracionTexto(s.creadoEn, s.solventadoEn ?? this.ahora()) },
          { etiqueta: 'Solventada', valor: s.solventadoEn ? fechaHora(s.solventadoEn) : null },
          { etiqueta: 'Solventada por', valor: s.solventadoPor },
        ],
      },
    ];
  });


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
        ver: 'x',
        gestionar: 'x',
      };
    }),
  );

  /** Ticket que llega del buscador (Ctrl + K): se abre su detalle al cargar. */
  private readonly abrirTicket = toSignal(inject(ActivatedRoute).queryParamMap, { requireSync: true });
  private ticketAbierto = '';
  private readonly abrirDesdeBuscador = effect(() => {
    const q = this.abrirTicket().get('q');
    const s = q && q !== this.ticketAbierto ? this.solicitudes().find((x) => x.ticket === q) : undefined;
    if (s) {
      this.ticketAbierto = s.ticket; // una sola vez por búsqueda
      untracked(() => { this.filtro.set('TODAS'); this.detalle.set(s); });
    }
  });

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
    if (evento.columna === 'ver') {
      this.detalle.set(s);
      return;
    }
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
