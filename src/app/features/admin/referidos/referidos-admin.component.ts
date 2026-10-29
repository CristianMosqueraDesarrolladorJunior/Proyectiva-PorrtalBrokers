import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CatalogoService } from '../../../core/services/catalogo.service';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';

import type { ReferidoConsola } from '../../../core/models/consola.model';
import { AdminService } from '../../../core/services/admin.service';
import { COLUMNA_GESTIONAR, COLUMNAS_FECHAS, celdasFechas, fechaHora } from '../../../core/services/admin.helpers';
import { ConsolaService } from '../../../core/services/consola.service';
import { mensajeErrorIntegracion } from '../../../core/util/errores-integracion';
import {
  BadgeEstadoComponent,
  BarraAccionesComponent,
  BitacoraComponent,
  BotonComponent,
  DataTableComponent,
  EstadoVistaComponent,
  FichaComponent,
  FormFieldComponent,
  GridLayoutComponent,
  KpiCardComponent,
  ModalDialogComponent,
  PageHeaderComponent,
  SegmentedControlComponent,
} from '../../../shared/components';
import type { AccionFila, ColumnaTabla, FilaTabla, OpcionSegmentada, SeccionFicha, Tab, VarianteBadge } from '../../../shared/components';
import { FeedbackService } from '../../../shared/services/feedback/feedback.service';

/** Color de la insignia por estado del referido (presentación; etiqueta del catálogo `estado_referido`). */
const VARIANTE_ESTADO: Readonly<Partial<Record<string, VarianteBadge>>> = { ACEPTADA: 'success', RECHAZADA: 'danger' };

/** Referidos de los brokers (otros ramos): datos completos, historial y gestión por el Administrador. */
@Component({
  selector: 'app-admin-referidos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeEstadoComponent,
    BarraAccionesComponent,
    BitacoraComponent,
    BotonComponent,
    DataTableComponent,
    EstadoVistaComponent,
    FichaComponent,
    FormFieldComponent,
    GridLayoutComponent,
    KpiCardComponent,
    ModalDialogComponent,
    PageHeaderComponent,
    SegmentedControlComponent,
  ],
  templateUrl: './referidos-admin.component.html',
  styleUrls: ['../admin-comun.scss'],
})
export class ReferidosAdminComponent {
  private readonly feedback = inject(FeedbackService);
  private readonly consola = inject(ConsolaService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly esAdmin = inject(AdminService).esAdmin();
  protected readonly estados = inject(CatalogoService).insignias('estado_referido', VARIANTE_ESTADO, 'info' as VarianteBadge);

  protected readonly referidos = signal<readonly ReferidoConsola[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal(false);

  protected readonly filtros: readonly OpcionSegmentada[] = [
    { valor: '', etiqueta: 'Todos' },
    { valor: 'EN_PROCESO', etiqueta: 'En proceso' },
    { valor: 'ACEPTADA', etiqueta: 'Aceptados' },
    { valor: 'RECHAZADA', etiqueta: 'Rechazados' },
  ];
  protected readonly filtro = signal('');

  protected readonly columnas: readonly ColumnaTabla[] = [
    { key: 'radicado', header: 'Radicado', ordenable: true },
    { key: 'referido', header: 'Referido', tipo: 'principal', ordenable: true },
    { key: 'contacto', header: 'Contacto', tipo: 'principal' },
    { key: 'ramo', header: 'Ramo', ordenable: true },
    { key: 'broker', header: 'Broker', tipo: 'principal', ordenable: true },
    { key: 'estado', header: 'Estado', tipo: 'badge', ordenable: true },
    ...COLUMNAS_FECHAS,
    { key: 'ver', header: '', tipo: 'accion', textoAccion: 'Ver' },
    COLUMNA_GESTIONAR,
  ];

  protected readonly visibles = computed(() =>
    this.filtro() ? this.referidos().filter((r) => r.estado === this.filtro()) : this.referidos(),
  );

  protected readonly filas = computed<readonly FilaTabla[]>(() =>
    this.visibles().map((r) => ({
      radicado: r.radicado,
      referido: r.nombre,
      referidoSub: r.cedula ?? '',
      contacto: r.correo ?? '—',
      contactoSub: r.celular ?? '',
      ramo: r.ramo ?? '—',
      broker: r.broker,
      brokerSub: r.comercial ?? '',
      estado: (this.estados[r.estado ?? ''] ?? { etiqueta: r.estado ?? 'Sin estado' }).etiqueta,
      estadoVariante: (this.estados[r.estado ?? ''] ?? { variante: 'info' as VarianteBadge }).variante,
      ...celdasFechas(r.creado, r.ultimoMovimiento),
      ver: '',
      gestionar: '',
    })),
  );

  protected conteo(estado: string): number {
    return this.referidos().filter((r) => r.estado === estado).length;
  }

  protected readonly seleccionado = signal<ReferidoConsola | null>(null);
  protected readonly pestana = signal('detalle');
  protected readonly pestanas = computed<readonly Tab[]>(() => [
    { id: 'detalle', etiqueta: 'Detalle' },
    ...(this.esAdmin ? [{ id: 'gestion', etiqueta: 'Gestión' }] : []),
    { id: 'historial', etiqueta: 'Historial' },
  ]);
  protected readonly opcionesEstado: readonly OpcionSegmentada[] = [
    { valor: 'EN_PROCESO', etiqueta: 'En proceso' },
    { valor: 'ACEPTADA', etiqueta: 'Aceptado' },
    { valor: 'RECHAZADA', etiqueta: 'Rechazado' },
  ];
  protected readonly estadoDestino = signal('EN_PROCESO');
  protected readonly nota = signal('');
  protected readonly guardando = signal(false);

  protected readonly ficha = computed<readonly SeccionFicha[]>(() => {
    const r = this.seleccionado();
    if (!r) return [];
    return [
      {
        titulo: 'Referido',
        icono: 'person_add',
        datos: [
          { etiqueta: 'Nombre', valor: r.nombre },
          { etiqueta: 'Cédula', valor: r.cedula },
          { etiqueta: 'Celular', valor: r.celular },
          { etiqueta: 'Correo', valor: r.correo },
          { etiqueta: 'Ramo', valor: r.ramo },
          { etiqueta: 'Comentario del broker', valor: r.comentario, ancho: true },
        ],
      },
      {
        titulo: 'Gestión',
        icono: 'assignment',
        datos: [
          { etiqueta: 'Radicado', valor: r.radicado },
          { etiqueta: 'Broker', valor: r.broker },
          { etiqueta: 'Comercial', valor: r.comercial },
          { etiqueta: 'Estado', valor: (this.estados[r.estado ?? ''] ?? { etiqueta: r.estado }).etiqueta },
          { etiqueta: 'Creado', valor: fechaHora(r.creado) },
          { etiqueta: 'Último movimiento', valor: fechaHora(r.ultimoMovimiento ?? r.creado) },
        ],
      },
    ];
  });

  /** Radicado que llega del buscador (Ctrl + K): se abre su detalle al cargar, una sola vez. */
  private readonly parametros = toSignal(inject(ActivatedRoute).queryParamMap, { requireSync: true });
  private radicadoAbierto = '';
  private readonly abrirDesdeBuscador = effect(() => {
    const q = this.parametros().get('q');
    const r = q && q !== this.radicadoAbierto ? this.referidos().find((x) => x.radicado === q) : undefined;
    if (r) {
      this.radicadoAbierto = r.radicado;
      untracked(() => {
        this.filtro.set('');
        this.seleccionado.set(r);
        this.pestana.set('detalle');
        this.estadoDestino.set(r.estado ?? 'EN_PROCESO');
        this.nota.set('');
      });
    }
  });

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.consola
      .referidos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.referidos.set(r);
          this.cargando.set(false);
        },
        error: () => {
          this.referidos.set([]);
          this.cargando.set(false);
          this.error.set(true);
        },
      });
  }

  protected v(evento: Event): string {
    return (evento.target as HTMLTextAreaElement).value;
  }

  protected gestionar(evento: AccionFila): void {
    const r = this.visibles().at(evento.indice);
    if (!r) return;
    this.seleccionado.set(r);
    // «Ver» abre el detalle; «Gestionar» va directo a la gestión (solo el admin la tiene).
    this.pestana.set(evento.columna === 'gestionar' && this.esAdmin ? 'gestion' : 'detalle');
    this.estadoDestino.set(r.estado ?? 'EN_PROCESO');
    this.nota.set('');
  }

  protected guardar(): void {
    const r = this.seleccionado();
    if (!r) return;
    this.guardando.set(true);
    this.consola
      .cambiarEstadoReferido(r.radicado, this.estadoDestino(), this.nota())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.seleccionado.set(null);
          this.feedback.toast({ variante: 'exito', mensaje: `Referido ${r.radicado} actualizado.` });
          this.cargar();
        },
        error: (err: unknown) => {
          this.guardando.set(false);
          this.feedback.toast({ variante: 'error', mensaje: mensajeErrorIntegracion(err) });
        },
      });
  }
}
