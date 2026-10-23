import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { CatalogoService } from '../../../core/services/catalogo.service';
import type { ComercialConsola, DetalleNegocioConsola, NegocioConsola } from '../../../core/models/consola.model';
import { AdminService } from '../../../core/services/admin.service';
import { COLUMNA_GESTIONAR, COLUMNAS_FECHAS, celdasFechas, cop, copCompacto, fechaCorta, fechaHora } from '../../../core/services/admin.helpers';
import { ConsolaService } from '../../../core/services/consola.service';
import { mensajeErrorIntegracion } from '../../../core/util/errores-integracion';
import {
  AlertBannerComponent,
  BadgeEstadoComponent,
  BitacoraComponent,
  BotonComponent,
  DataTableComponent,
  EstadoVistaComponent,
  FichaComponent,
  FiltradoInteligenteComponent,
  FormFieldComponent,
  GridLayoutComponent,
  KpiCardComponent,
  ModalDialogComponent,
  PageHeaderComponent,
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
import { GestionNegocioComponent } from './gestion-negocio/gestion-negocio.component';

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
/** Resultado de Conocimiento de Cliente del negocio, en palabras (con formulario cargado no es un riesgo abierto: PR15). */
const ETIQUETA_SARLAFT: Readonly<Record<string, string>> = {
  actualizado: 'Actualizado',
  desactualizado: 'Desactualizado',
  formulario_cargado: 'Formulario cargado · por revisar',
  consultable: 'En revisión de Cumplimiento',
  rechazado: 'Rechazado',
};

@Component({
  selector: 'app-admin-negocios',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AlertBannerComponent,
    BadgeEstadoComponent,
    BitacoraComponent,
    BotonComponent,
    DataTableComponent,
    EstadoVistaComponent,
    FichaComponent,
    FiltradoInteligenteComponent,
    FormFieldComponent,
    GridLayoutComponent,
    KpiCardComponent,
    ModalDialogComponent,
    PageHeaderComponent,
    GestionNegocioComponent,
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

  // --- Filtro de toda la vista (indicadores y tabla) ---
  protected readonly fBusqueda = signal('');
  protected readonly fComercial = signal('');
  protected readonly fBroker = signal('');
  protected readonly fDesde = signal('');
  protected readonly fHasta = signal('');
  protected readonly nombresComerciales = computed(() =>
    [...new Set(this.negocios().map((n) => n.comercial ?? 'Sin asignar'))].sort());
  protected readonly hayFiltros = computed(() =>
    !!(this.fBusqueda() || this.fComercial() || this.fBroker() || this.fDesde() || this.fHasta()) || this.filtro() !== 'curso');

  protected limpiarFiltros(): void {
    [this.fBusqueda, this.fComercial, this.fBroker, this.fDesde, this.fHasta].forEach((s) => s.set(''));
    this.filtro.set('curso');
  }

  /** Negocios dentro del filtro (sin la etapa): de aquí salen los indicadores. */
  private readonly filtrados = computed(() => {
    const q = this.fBusqueda().trim().toLowerCase();
    const broker = this.fBroker().trim().toLowerCase();
    const [comercial, desde, hasta] = [this.fComercial(), this.fDesde(), this.fHasta()];
    return this.negocios().filter((n) => {
      const dia = (n.creado ?? '').slice(0, 10);
      const texto = [n.radicado, n.numeroPoliza, n.propietario, n.inquilino, n.inmueble, n.broker].join(' ').toLowerCase();
      return (!q || texto.includes(q)) && (!broker || n.broker.toLowerCase().includes(broker))
        && (!comercial || (n.comercial ?? 'Sin asignar') === comercial)
        && (!desde || dia >= desde) && (!hasta || dia <= hasta);
    });
  });

  // Lo más relevante; inquilino, inmueble y canon están en el detalle.
  protected readonly columnas: readonly ColumnaTabla[] = [
    { key: 'radicado', header: 'Radicado', tipo: 'principal', ordenable: true },
    { key: 'propietario', header: 'Propietario', tipo: 'principal', ordenable: true },
    { key: 'broker', header: 'Broker', tipo: 'principal', ordenable: true },
    ...(this.admin.esAdmin() ? [{ key: 'comercial', header: 'Comercial', ordenable: true }] : []),
    { key: 'prima', header: 'Prima', alinear: 'derecha', ordenable: true, nowrap: true },
    { key: 'estado', header: 'Estado', tipo: 'badge', ordenable: true },
    ...COLUMNAS_FECHAS,
    COLUMNA_GESTIONAR,
  ];

  protected readonly visibles = computed(() => {
    const f = this.filtro();
    return this.filtrados().filter((n) =>
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
      propietarioSub: n.inmueble ? `${n.inmueble}${n.ciudad ? ' · ' + n.ciudad : ''}` : '',
      broker: n.broker,
      brokerSub: n.brokerEstado === 'PROSPECTO' ? 'Prospecto' : 'Broker registrado',
      comercial: n.comercial ?? 'Sin asignar',
      prima: n.prima === null ? '—' : cop(n.prima),
      primaOrden: n.prima ?? 0,
      estado: this.etiquetaEstado[n.estado] ?? n.estado,
      estadoVariante: varianteEstado(n.estado),
      ...celdasFechas(n.creado, n.ultimoMovimiento),
      gestionar: '',
    })),
  );

  protected readonly enCurso = computed(() => this.filtrados().filter((n) => !this.finales.includes(n.estado)).length);
  protected readonly expedidos = computed(() => this.filtrados().filter((n) => n.estado === 'EXPEDIDA').length);
  protected readonly primaExpedida = computed(() =>
    this.filtrados().filter((n) => n.estado === 'EXPEDIDA').reduce((t, n) => t + (n.prima ?? 0), 0),
  );

  // --- Modal de operación ---
  protected readonly detalle = signal<DetalleNegocioConsola | null>(null);
  protected readonly pestana = signal('negocio');
  protected readonly pestanas = computed<readonly Tab[]>(() => [
    { id: 'negocio', etiqueta: 'Negocio' },
    { id: 'gestionar', etiqueta: 'Gestionar' },
    { id: 'historial', etiqueta: 'Historial' },
  ]);
  protected readonly guardando = signal(false);
  protected readonly comerciales = signal<readonly ComercialConsola[]>([]);
  protected readonly comercialDestino = signal('');

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
          { etiqueta: 'Conocimiento de Cliente', valor: ETIQUETA_SARLAFT[d.sarlaft ?? ''] ?? d.sarlaft },
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
    // Llega desde el buscador de la barra superior: muestra esa radicación en cualquier etapa.
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((p) => {
        const q = p.get('q');
        if (q) {
          this.limpiarFiltros();
          this.fBusqueda.set(q);
          this.filtro.set('todos');
        }
      });
    if (this.esAdmin) {
      this.consola
        .comerciales()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (c) => this.comerciales.set(c.filter((x) => x.activo)), error: () => this.comerciales.set([]) });
    }
  }

  /** Reasigna solo este negocio, con confirmación (auditoría de producción PR25/PR35). */
  protected reasignarNegocio(): void {
    const n = this.detalle()?.negocio;
    const codigo = this.comercialDestino();
    if (!n || !codigo) return;
    const nombre = this.comerciales().find((c) => c.codigo === codigo)?.nombre ?? codigo;
    this.feedback.info({
      titulo: 'Reasignar negocio',
      mensaje: `El negocio ${n.radicado} pasará a ${nombre}. Los demás negocios de ${n.broker} siguen con su comercial y el cambio queda en la actividad del broker.`,
      acciones: { confirmar: 'Reasignar', cancelar: 'Cancelar' },
      alResolver: (r) => {
        if (r !== 'confirmar') return;
        this.guardando.set(true);
        this.consola
          .reasignarNegocio(n.radicado, codigo)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.guardando.set(false);
              this.comercialDestino.set('');
              this.feedback.toast({ variante: 'exito', mensaje: `El negocio ${n.radicado} pasó a ${nombre}.` });
              this.cargar();
              this.abrir(n.radicado);
            },
            error: (err: unknown) => {
              this.guardando.set(false);
              this.feedback.toast({ variante: 'error', mensaje: mensajeErrorIntegracion(err) });
            },
          });
      },
    });
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
    this.consola
      .negocio(radicado)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (d) => {
        this.detalle.set(d);
        // En corrección se abre directo en «Gestionar»: es lo que el comercial viene a hacer.
        if (d.negocio.estado === 'EN_CORRECCION') this.pestana.set('gestionar');
      }, error: (err: unknown) => this.feedback.toast({ variante: 'error', mensaje: mensajeErrorIntegracion(err) }) });
  }

  /** Tras gestionar (nota, documento o reenvío) se recarga el negocio y la tabla. */
  protected recargar(radicado: string): void {
    this.cargar();
    this.abrir(radicado);
    this.pestana.set('gestionar');
  }

  protected v(evento: Event): string {
    return (evento.target as HTMLSelectElement | HTMLTextAreaElement).value;
  }
}
