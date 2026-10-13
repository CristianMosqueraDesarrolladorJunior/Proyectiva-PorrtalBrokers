import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CatalogoService } from '../../../core/services/catalogo.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import type { RenovacionConsola } from '../../../core/models/consola.model';
import type { InduccionAdminResponse } from '../../../core/models/renovacion.model';
import { AdminService } from '../../../core/services/admin.service';
import { COLUMNA_GESTIONAR, COLUMNAS_FECHAS, celdasFechas, cop, fechaCorta, fechaHora } from '../../../core/services/admin.helpers';
import { ConsolaService } from '../../../core/services/consola.service';
import { RenovacionService } from '../../../core/services/renovacion.service';
import { mensajeErrorIntegracion } from '../../../core/util/errores-integracion';
import {
  AlertBannerComponent,
  BadgeEstadoComponent,
  BarraAccionesComponent,
  BitacoraComponent,
  BotonComponent,
  DataTableComponent,
  EstadoVistaComponent,
  FichaComponent,
  GridLayoutComponent,
  KpiCardComponent,
  ModalDialogComponent,
  PageHeaderComponent,
  SegmentedControlComponent,
  VisorArchivoComponent,
} from '../../../shared/components';
import type {
  AccionFila,
  ColumnaTabla,
  EventoBitacora,
  FilaTabla,
  OpcionSegmentada,
  SeccionFicha,
  Tab,
  VarianteBadge,
} from '../../../shared/components';

/** Color de la insignia por estado de renovación (presentación; etiqueta del catálogo `estado_renovacion`). */
const VARIANTE_ESTADO: Readonly<Partial<Record<string, VarianteBadge>>> = {
  pendiente: 'warning',
  renovada: 'success',
  no_renovada: 'danger',
  caso_especial: 'warning',
};

/** "actor:estado -> actor:estado" → pasos, sin repeticiones consecutivas. */
export function pasosHistorial(historial: string | null): readonly EventoBitacora[] {
  if (!historial) return [];
  const pasos: EventoBitacora[] = [];
  for (const crudo of historial.split('->').map((p) => p.trim()).filter(Boolean)) {
    const i = crudo.lastIndexOf(':');
    const actor = i > 0 ? crudo.slice(0, i).trim() : 'Sistema';
    const estado = i > 0 ? crudo.slice(i + 1).trim() : crudo;
    const previo = pasos.at(-1);
    if (previo && previo.tipo === estado && previo.descripcion === actor) continue;
    pasos.push({ fecha: '', tipo: estado || 'Sin estado', descripcion: actor });
  }
  return pasos;
}

/**
 * Renovaciones: muestra del Warehouse (como las gestiona hoy "Comercial renovaciones") con sus casos
 * especiales, y las inducciones de pólizas vencidas que envían los brokers desde el portal.
 */
@Component({
  selector: 'app-admin-renovaciones',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AlertBannerComponent,
    BadgeEstadoComponent,
    BarraAccionesComponent,
    BitacoraComponent,
    BotonComponent,
    DataTableComponent,
    EstadoVistaComponent,
    FichaComponent,
    GridLayoutComponent,
    KpiCardComponent,
    ModalDialogComponent,
    PageHeaderComponent,
    SegmentedControlComponent,
    VisorArchivoComponent,
  ],
  templateUrl: './renovaciones-admin.component.html',
  styleUrls: ['../admin-comun.scss'],
})
export class RenovacionesAdminComponent {
  private readonly admin = inject(AdminService);
  private readonly consola = inject(ConsolaService);
  private readonly renovacionesBroker = inject(RenovacionService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly esAdmin = this.admin.esAdmin();
  protected readonly estados = inject(CatalogoService).insignias('estado_renovacion', VARIANTE_ESTADO, 'info' as VarianteBadge);

  protected readonly vistas: readonly OpcionSegmentada[] = [
    { valor: 'warehouse', etiqueta: 'Renovaciones', icono: 'update' },
    { valor: 'especiales', etiqueta: 'Casos especiales', icono: 'report' },
    { valor: 'inducciones', etiqueta: 'Inducciones', icono: 'assignment_return' },
  ];
  protected readonly vista = signal<'warehouse' | 'especiales' | 'inducciones'>('warehouse');
  protected readonly filtrosEstado: readonly OpcionSegmentada[] = [
    { valor: '', etiqueta: 'Todas' },
    { valor: 'pendiente', etiqueta: 'Pendientes' },
    { valor: 'en_gestion', etiqueta: 'En gestión' },
    { valor: 'renovada', etiqueta: 'Renovadas' },
    { valor: 'no_renovada', etiqueta: 'No renovadas' },
  ];
  protected readonly estado = signal('');

  protected readonly renovaciones = signal<readonly RenovacionConsola[]>([]);
  protected readonly inducciones = signal<readonly InduccionAdminResponse[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal(false);
  protected readonly mensaje = signal('');
  protected readonly ingiriendo = signal(false);

  protected readonly columnas: readonly ColumnaTabla[] = [
    { key: 'poliza', header: 'Póliza', tipo: 'principal', ordenable: true },
    { key: 'asegurado', header: 'Asegurado', tipo: 'principal', ordenable: true },
    { key: 'broker', header: 'Broker', tipo: 'principal', ordenable: true },
    { key: 'gestor', header: 'Gestor', ordenable: true },
    { key: 'canon', header: 'Canon', alinear: 'derecha', ordenable: true },
    { key: 'vence', header: 'Vence', ordenable: true },
    { key: 'estado', header: 'Estado', tipo: 'badge', ordenable: true },
    { key: 'gestion', header: 'Gestión actual', tipo: 'principal' },
    ...COLUMNAS_FECHAS,
    COLUMNA_GESTIONAR,
  ];

  protected readonly visibles = computed(() => {
    const todas = this.renovaciones();
    if (this.vista() === 'especiales') return todas.filter((r) => r.estado === 'caso_especial');
    return this.estado() ? todas.filter((r) => r.estado === this.estado()) : todas;
  });

  protected readonly filas = computed<readonly FilaTabla[]>(() =>
    this.visibles().map((r) => ({
      poliza: r.poliza,
      polizaSub: r.segmento ?? '',
      asegurado: r.asegurado ?? '—',
      aseguradoSub: r.aseguradoDocumento ?? '',
      broker: r.broker ?? 'Sin broker',
      brokerSub: r.direccion ?? '',
      gestor: r.gestor ?? 'Sin asignar',
      canon: r.canon === null ? '—' : cop(r.canon),
      canonOrden: r.canon ?? 0,
      vence: r.vence ? fechaCorta(r.vence) : '—',
      venceOrden: r.vence ?? '',
      estado: (this.estados[r.estado] ?? { etiqueta: r.estado }).etiqueta,
      estadoVariante: (this.estados[r.estado] ?? { variante: 'info' as VarianteBadge }).variante,
      gestion: r.estadoWarehouse ?? 'Sin gestión',
      gestionSub: r.casoEspecial ? `Caso: ${r.casoEspecial}` : '',
      ...celdasFechas(r.creado, r.ultimoMovimiento),
      gestionar: '',
    })),
  );

  protected readonly columnasInducciones: readonly ColumnaTabla[] = [
    { key: 'radicado', header: 'Radicado', tipo: 'principal', ordenable: true },
    { key: 'broker', header: 'Broker', tipo: 'principal', ordenable: true },
    { key: 'envio', header: 'Aviso al área', tipo: 'badge' },
    ...COLUMNAS_FECHAS,
    COLUMNA_GESTIONAR,
  ];

  protected readonly filasInducciones = computed<readonly FilaTabla[]>(() =>
    this.inducciones().map((i) => ({
      radicado: i.radicado,
      radicadoSub: `Póliza ${i.numeroPoliza}`,
      broker: i.broker,
      brokerSub: i.comercial,
      envio: i.enviada ? 'Correo enviado' : 'Pendiente de correo',
      envioVariante: i.enviada ? 'success' : 'warning',
      ...celdasFechas(i.fecha, i.fecha),
      gestionar: '',
    })),
  );

  protected conteo(estado: string): number {
    return this.renovaciones().filter((r) => r.estado === estado).length;
  }

  // --- Modal de renovación ---
  protected readonly renovacion = signal<RenovacionConsola | null>(null);
  protected readonly pestana = signal('detalle');
  protected readonly pestanasRenovacion: readonly Tab[] = [
    { id: 'detalle', etiqueta: 'Detalle' },
    { id: 'historial', etiqueta: 'Historial de gestión' },
  ];
  protected readonly historial = computed(() => pasosHistorial(this.renovacion()?.historial ?? null));
  protected readonly fichaRenovacion = computed<readonly SeccionFicha[]>(() => {
    const r = this.renovacion();
    if (!r) return [];
    return [
      {
        titulo: 'Póliza de arrendamiento',
        icono: 'policy',
        datos: [
          { etiqueta: 'Número', valor: r.poliza },
          { etiqueta: 'Segmento', valor: r.segmento },
          { etiqueta: 'Inicio de vigencia', valor: r.inicioVigencia ? fechaCorta(r.inicioVigencia) : null },
          { etiqueta: 'Vencimiento', valor: r.vence ? fechaCorta(r.vence) : null },
          { etiqueta: 'Canon', valor: r.canon === null ? null : cop(r.canon), destacado: true },
          { etiqueta: 'Dirección del riesgo', valor: r.direccion, ancho: true },
        ],
      },
      {
        titulo: 'Asegurado',
        icono: 'person',
        datos: [
          { etiqueta: 'Nombre', valor: r.asegurado },
          { etiqueta: 'Documento', valor: r.aseguradoDocumento },
          { etiqueta: 'Teléfono', valor: r.telefono },
          { etiqueta: 'Correo', valor: r.correo },
        ],
      },
      {
        titulo: 'Gestión',
        icono: 'assignment',
        datos: [
          { etiqueta: 'Broker / inmobiliaria', valor: r.broker },
          { etiqueta: 'Gestor asignado', valor: r.gestor },
          { etiqueta: 'Estado en el portal', valor: (this.estados[r.estado] ?? { etiqueta: r.estado }).etiqueta },
          { etiqueta: 'Estado de gestión', valor: r.estadoWarehouse },
          { etiqueta: 'Caso especial', valor: r.casoEspecial },
          { etiqueta: 'Ingerido', valor: fechaHora(r.creado) },
          { etiqueta: 'Último movimiento', valor: fechaHora(r.ultimoMovimiento ?? r.creado) },
        ],
      },
    ];
  });

  // --- Modal de inducción ---
  protected readonly induccion = signal<InduccionAdminResponse | null>(null);
  protected readonly pestanaInduccion = signal('detalle');
  protected readonly pestanasInduccion: readonly Tab[] = [
    { id: 'detalle', etiqueta: 'Detalle' },
    { id: 'contrato', etiqueta: 'Contrato' },
    { id: 'pazYSalvo', etiqueta: 'Paz y salvo' },
  ];
  protected readonly archivo = signal<Blob | null>(null);
  protected readonly cargandoArchivo = signal(false);
  protected readonly fichaInduccion = computed<readonly SeccionFicha[]>(() => {
    const i = this.induccion();
    if (!i) return [];
    return [
      {
        titulo: 'Inducción de póliza vencida',
        icono: 'history',
        datos: [
          { etiqueta: 'Radicado', valor: i.radicado },
          { etiqueta: 'Póliza', valor: i.numeroPoliza },
          { etiqueta: 'Broker', valor: i.broker },
          { etiqueta: 'Comercial', valor: i.comercial },
          { etiqueta: 'Estado', valor: i.estado },
          { etiqueta: 'Aviso al área', valor: i.enviada ? 'Correo enviado' : 'Pendiente de correo' },
          { etiqueta: 'Enviada', valor: fechaHora(i.fecha) },
        ],
      },
    ];
  });

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.consola
      .renovaciones()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.renovaciones.set(r);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.error.set(true);
        },
      });
    this.admin
      .listarInducciones()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (i) => this.inducciones.set(i), error: () => this.inducciones.set([]) });
  }

  protected cambiarVista(v: string): void {
    this.vista.set(v === 'inducciones' ? 'inducciones' : v === 'especiales' ? 'especiales' : 'warehouse');
  }

  protected ingerir(): void {
    this.ingiriendo.set(true);
    this.consola
      .ingerirRenovaciones(200)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.ingiriendo.set(false);
          this.mensaje.set(`Se actualizaron ${r.renovaciones} renovaciones desde el Warehouse.`);
          this.cargar();
        },
        error: (err: unknown) => {
          this.ingiriendo.set(false);
          this.mensaje.set(mensajeErrorIntegracion(err));
        },
      });
  }

  protected gestionar(evento: AccionFila): void {
    const r = this.visibles().at(evento.indice);
    if (!r) return;
    this.renovacion.set(r);
    this.pestana.set('detalle');
  }

  protected gestionarInduccion(evento: AccionFila): void {
    const i = this.inducciones().at(evento.indice);
    if (!i) return;
    this.induccion.set(i);
    this.cambiarPestanaInduccion('detalle');
  }

  protected cambiarPestanaInduccion(p: string): void {
    this.pestanaInduccion.set(p);
    const i = this.induccion();
    if (!i || p === 'detalle') return;
    this.archivo.set(null);
    this.cargandoArchivo.set(true);
    this.renovacionesBroker
      .descargarArchivoInduccion(i.id, p === 'pazYSalvo' ? 'pazYSalvo' : 'contrato')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (b) => {
          this.archivo.set(b);
          this.cargandoArchivo.set(false);
        },
        error: () => this.cargandoArchivo.set(false),
      });
  }
}
