import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { CatalogoService } from '../../../core/services/catalogo.service';
import type { DetalleNegocioConsola, NegocioConsola } from '../../../core/models/consola.model';
import { AdminService } from '../../../core/services/admin.service';
import { COLUMNA_GESTIONAR, COLUMNAS_FECHAS, celdasFechas, cop, copCompacto, fechaCorta, fechaHora } from '../../../core/services/admin.helpers';
import { ConsolaService } from '../../../core/services/consola.service';
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
  FormFieldComponent,
  GridLayoutComponent,
  KpiCardComponent,
  ModalDialogComponent,
  PageHeaderComponent,
  SegmentedControlComponent,
} from '../../../shared/components';
import type {
  AccionFila,
  ColumnaTabla,
  FilaTabla,
  OpcionSegmentada,
  SeccionFicha,
  Tab,
  VarianteBadge,
} from '../../../shared/components';
import { FeedbackService } from '../../../shared/services/feedback/feedback.service';

function varianteEstado(estado: string): VarianteBadge {
  if (estado === 'EXPEDIDA' || estado === 'APROBADA') return 'success';
  if (estado === 'RECHAZADA' || estado === 'ANULADA') return 'danger';
  if (estado === 'PENDIENTE_DOCUMENTOS' || estado === 'EN_CORRECCION') return 'warning';
  return 'info';
}

/**
 * Negocios radicados: se muestra al PROPIETARIO del inmueble y todo lo que lleva el negocio. El negocio
 * termina al expedir la póliza. Gestión (cambio de estado / expedición) solo para el Administrador.
 */
@Component({
  selector: 'app-admin-negocios',
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
    FormFieldComponent,
    GridLayoutComponent,
    KpiCardComponent,
    ModalDialogComponent,
    PageHeaderComponent,
    SegmentedControlComponent,
  ],
  templateUrl: './negocios.component.html',
  styleUrls: ['../admin-comun.scss'],
})
export class NegociosComponent {
  private readonly feedback = inject(FeedbackService);
  private readonly admin = inject(AdminService);
  private readonly consola = inject(ConsolaService);
  private readonly catalogo = inject(CatalogoService);
  /** Estados finales del negocio (catálogo `estado_solicitud`, columna `final`). */
  private readonly finales = this.catalogo.codigos('estado_solicitud', 'final');
  private readonly destroyRef = inject(DestroyRef);

  protected readonly esAdmin = this.admin.esAdmin();
  protected readonly compacto = copCompacto;
  protected readonly etiquetaEstado = this.catalogo.etiquetas('estado_solicitud');
  protected readonly varianteEstado = varianteEstado;

  protected readonly negocios = signal<readonly NegocioConsola[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal(false);

  protected readonly filtros: readonly OpcionSegmentada[] = [
    { valor: 'curso', etiqueta: 'En curso' },
    { valor: 'expedidos', etiqueta: 'Expedidos' },
    { valor: 'cerrados', etiqueta: 'Rechazados / anulados' },
    { valor: 'todos', etiqueta: 'Todos' },
  ];
  protected readonly filtro = signal('curso');

  protected readonly columnas: readonly ColumnaTabla[] = [
    { key: 'radicado', header: 'Radicado', tipo: 'principal', ordenable: true },
    { key: 'propietario', header: 'Propietario', tipo: 'principal', ordenable: true },
    { key: 'inquilino', header: 'Inquilino', tipo: 'principal' },
    { key: 'inmueble', header: 'Inmueble', tipo: 'principal' },
    { key: 'broker', header: 'Broker', tipo: 'principal', ordenable: true },
    { key: 'comercial', header: 'Comercial', ordenable: true },
    { key: 'canon', header: 'Canon', alinear: 'derecha', ordenable: true },
    { key: 'prima', header: 'Prima', alinear: 'derecha', ordenable: true },
    { key: 'estado', header: 'Estado', tipo: 'badge', ordenable: true },
    ...COLUMNAS_FECHAS,
    COLUMNA_GESTIONAR,
  ];

  protected readonly visibles = computed(() => {
    const f = this.filtro();
    return this.negocios().filter((n) =>
      f === 'todos' ? true
        : f === 'expedidos' ? n.estado === 'EXPEDIDA'
          : f === 'cerrados' ? n.estado === 'RECHAZADA' || n.estado === 'ANULADA'
            : !this.finales.includes(n.estado),
    );
  });

  protected readonly filas = computed<readonly FilaTabla[]>(() =>
    this.visibles().map((n) => ({
      radicado: n.radicado,
      radicadoSub: n.numeroPoliza ? `Póliza ${n.numeroPoliza}` : '',
      propietario: n.propietario ?? '—',
      propietarioSub: [n.propietarioDocumento, n.propietarioTelefono].filter(Boolean).join(' · '),
      inquilino: n.inquilino ?? '—',
      inquilinoSub: n.inquilinoDocumento ?? '',
      inmueble: n.inmueble ?? '—',
      inmuebleSub: n.ciudad ?? '',
      broker: n.broker,
      brokerSub: n.brokerEstado === 'PROSPECTO' ? 'Prospecto' : 'Broker registrado',
      comercial: n.comercial ?? 'Sin asignar',
      canon: n.canon === null ? '—' : cop(n.canon),
      canonOrden: n.canon ?? 0,
      prima: n.prima === null ? '—' : cop(n.prima),
      primaOrden: n.prima ?? 0,
      estado: this.etiquetaEstado[n.estado] ?? n.estado,
      estadoVariante: varianteEstado(n.estado),
      ...celdasFechas(n.creado, n.ultimoMovimiento),
      gestionar: '',
    })),
  );

  protected readonly enCurso = computed(() => this.negocios().filter((n) => !this.finales.includes(n.estado)).length);
  protected readonly expedidos = computed(() => this.negocios().filter((n) => n.estado === 'EXPEDIDA').length);
  protected readonly primaExpedida = computed(() =>
    this.negocios().filter((n) => n.estado === 'EXPEDIDA').reduce((t, n) => t + (n.prima ?? 0), 0),
  );

  // --- Modal de operación ---
  protected readonly detalle = signal<DetalleNegocioConsola | null>(null);
  protected readonly pestana = signal('negocio');
  protected readonly pestanas = computed<readonly Tab[]>(() => [
    { id: 'negocio', etiqueta: 'Negocio' },
    ...(this.esAdmin ? [{ id: 'gestion', etiqueta: 'Gestión' }] : []),
    { id: 'historial', etiqueta: 'Historial' },
  ]);
  /** Estados destino permitidos: los calcula el backend al abrir el negocio. */
  protected readonly opcionesEstado = signal<readonly string[]>([]);
  protected readonly estadoDestino = signal('');
  protected readonly observacion = signal('');
  protected readonly guardando = signal(false);

  protected readonly ficha = computed<readonly SeccionFicha[]>(() => {
    const d = this.detalle();
    if (!d) return [];
    const n = d.negocio;
    return [
      {
        titulo: 'Tomador · propietario del inmueble',
        icono: 'home_work',
        datos: [
          { etiqueta: 'Nombre', valor: d.propietario.nombre },
          { etiqueta: 'Documento', valor: [d.propietario.tipoDocumento, d.propietario.documento].filter(Boolean).join(' ') },
          { etiqueta: 'Teléfono', valor: d.propietario.telefono },
          { etiqueta: 'Correo', valor: d.propietario.correo },
          { etiqueta: 'Dirección de residencia', valor: d.propietario.direccion, ancho: true },
        ],
      },
      {
        titulo: 'Arrendatario afianzado',
        icono: 'person',
        datos: [
          { etiqueta: 'Nombre', valor: d.inquilino.nombre },
          { etiqueta: 'Documento', valor: [d.inquilino.tipoDocumento, d.inquilino.documento].filter(Boolean).join(' ') },
          { etiqueta: 'Teléfono', valor: d.inquilino.telefono },
          { etiqueta: 'Correo', valor: d.inquilino.correo },
        ],
      },
      {
        titulo: 'Riesgo asegurado · inmueble',
        icono: 'apartment',
        datos: [
          { etiqueta: 'Dirección', valor: n.inmueble, ancho: true },
          { etiqueta: 'Ciudad', valor: n.ciudad },
          { etiqueta: 'Tipo', valor: d.tipoInmueble },
          { etiqueta: 'Uso', valor: d.uso },
          { etiqueta: 'Matrícula inmobiliaria', valor: d.matricula },
          { etiqueta: 'Estrato', valor: d.estrato },
          { etiqueta: 'Área', valor: d.areaM2 === null ? null : `${d.areaM2} m²` },
        ],
      },
      {
        titulo: 'Contrato y valores asegurados',
        icono: 'request_quote',
        datos: [
          { etiqueta: 'Canon mensual', valor: n.canon === null ? null : cop(n.canon), destacado: true },
          { etiqueta: 'Administración', valor: d.administracion === null ? null : cop(d.administracion) },
          { etiqueta: 'Duración', valor: d.duracionMeses === null ? null : `${d.duracionMeses} meses` },
          { etiqueta: 'Día de pago', valor: d.diaPago },
          { etiqueta: 'Inicio del contrato', valor: d.inicioContrato ? fechaCorta(d.inicioContrato) : null },
          { etiqueta: 'Valor asegurado', valor: n.valorAsegurado === null ? null : cop(n.valorAsegurado) },
          { etiqueta: 'Cotización', valor: d.cotizacion },
          { etiqueta: 'Prima neta', valor: d.primaNeta === null ? null : cop(d.primaNeta) },
          { etiqueta: 'IVA', valor: d.iva === null ? null : cop(d.iva) },
          { etiqueta: 'Prima total', valor: n.prima === null ? null : cop(n.prima), destacado: true },
          { etiqueta: 'Comisión estimada', valor: d.comisionEstimada === null ? null : cop(d.comisionEstimada) },
        ],
      },
      {
        titulo: 'Estudio de riesgo, SARLAFT y póliza',
        icono: 'verified_user',
        datos: [
          { etiqueta: 'Número de estudio', valor: d.numeroEstudio },
          { etiqueta: 'Resultado del estudio', valor: d.estadoEstudio },
          { etiqueta: 'SARLAFT', valor: d.sarlaft },
          { etiqueta: 'Estado del negocio', valor: this.etiquetaEstado[n.estado] ?? n.estado },
          { etiqueta: 'Póliza expedida', valor: n.numeroPoliza ?? 'Sin expedir' },
          { etiqueta: 'Broker', valor: `${n.broker} (${n.brokerEstado === 'PROSPECTO' ? 'prospecto' : 'registrado'})` },
          { etiqueta: 'Comercial', valor: n.comercial ?? 'Sin asignar' },
          { etiqueta: 'Radicado', valor: fechaHora(n.creado) },
          { etiqueta: 'Último movimiento', valor: fechaHora(n.ultimoMovimiento ?? n.creado) },
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
      .negocios()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (n) => {
          this.negocios.set(n);
          this.cargando.set(false);
        },
        error: () => {
          this.negocios.set([]);
          this.cargando.set(false);
          this.error.set(true);
        },
      });
  }

  protected gestionar(evento: AccionFila): void {
    const n = this.visibles().at(evento.indice);
    if (!n) return;
    this.abrir(n.radicado);
  }

  private abrir(radicado: string): void {
    this.pestana.set('negocio');
    this.estadoDestino.set('');
    this.observacion.set('');
    this.opcionesEstado.set([]);
    this.consola
      .negocio(radicado)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (d) => this.detalle.set(d), error: (err: unknown) => this.feedback.toast({ variante: 'error', mensaje: mensajeErrorIntegracion(err) }) });
    if (this.esAdmin) {
      this.admin
        .siguientesEstados(radicado)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (estados) => this.opcionesEstado.set(estados), error: () => this.opcionesEstado.set([]) });
    }
  }

  protected v(evento: Event): string {
    return (evento.target as HTMLSelectElement | HTMLTextAreaElement).value;
  }

  protected aplicarEstado(): void {
    const d = this.detalle();
    const destino = this.estadoDestino();
    if (!d || !destino) return;
    this.guardando.set(true);
    this.admin
      .cambiarEstadoNegocio(d.negocio.radicado, destino, this.observacion())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.guardando.set(false);
          this.feedback.toast({
            variante: 'exito',
            mensaje:
              r.numeroPoliza
                ? `Negocio ${r.radicado} expedido con la póliza ${r.numeroPoliza}: el negocio terminó.`
                : `Negocio ${r.radicado} quedó ${this.etiquetaEstado[destino] ?? destino}.`,
          });
          this.cargar();
          this.abrir(r.radicado);
        },
        error: (err: unknown) => {
          this.guardando.set(false);
          this.feedback.toast({ variante: 'error', mensaje: mensajeErrorIntegracion(err) });
        },
      });
  }
}
