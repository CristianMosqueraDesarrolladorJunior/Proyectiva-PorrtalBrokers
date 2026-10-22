import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CatalogoService } from '../../../core/services/catalogo.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import type {
  CredencialGenerada,
  DocumentoExpediente,
  ExpedienteProspecto,
  PersonaRequest,
  ProspectoConsola,
  ComercialConsola,
} from '../../../core/models/consola.model';
import { AdminService } from '../../../core/services/admin.service';
import { COLUMNA_GESTIONAR, COLUMNAS_FECHAS, celdasFechas, cop, copCompacto, fechaHora } from '../../../core/services/admin.helpers';
import { ConsolaService } from '../../../core/services/consola.service';
import { mensajeErrorIntegracion } from '../../../core/util/errores-integracion';
import {
  AlertBannerComponent,
  BadgeEstadoComponent,
  BitacoraComponent,
  BotonComponent,
  CredencialUnicaComponent,
  DataTableComponent,
  EstadoVistaComponent,
  FichaComponent,
  FormFieldComponent,
  GridLayoutComponent,
  KpiCardComponent,
  ModalDialogComponent,
  PageHeaderComponent,
  VisorArchivoComponent,
  InfoBoxComponent,
} from '../../../shared/components';
import type { AccionFila, ColumnaTabla, FilaTabla, SeccionFicha, Tab, VarianteBadge } from '../../../shared/components';
import { FormPersonaComponent } from '../componentes/form-persona.component';

/** Color de la insignia de legalización (presentación; etiqueta del catálogo `estado_registro_broker`). */
const VARIANTE_LEGALIZACION: Readonly<Partial<Record<string, VarianteBadge>>> = {
  EN_REVISION: 'warning',
  RECHAZADA: 'danger',
  APROBADA: 'success',
};

/** Faltante del validador → texto para el área (nombres de documento del catálogo `documento_legalizacion`). */
function faltante(codigo: string, documentos: Readonly<Record<string, string>>): string {
  if (codigo.startsWith('documento:')) {
    const tipo = codigo.slice('documento:'.length);
    return `Falta el documento: ${documentos[tipo] ?? tipo}`;
  }
  if (codigo === 'sarlaft:no_disponible' || codigo === 'sarlaft:no_consultado') {
    return 'Falta el formulario de Conocimiento de Cliente (SARLAFT) diligenciado y firmado';
  }
  if (codigo.startsWith('sarlaft:')) return `SARLAFT no permite continuar (${codigo.slice(8)})`;
  const textos: Record<string, string> = {
    resultadoSarlaft: 'Falta el formulario de Conocimiento de Cliente (SARLAFT) diligenciado y firmado',
    correo: 'Falta el correo',
    telefono: 'Falta el teléfono',
    nombre: 'Falta el nombre',
    'cuenta:ya_registrada': 'La cuenta ya es broker registrado',
  };
  return textos[codigo] ?? codigo;
}
import { FeedbackService } from '../../../shared/services/feedback/feedback.service';
import { consultaSarlaftHabilitada } from '../../../core/util/sarlaft';

/** Nombre comparable: sin tildes, minúsculas y espacios simples. */
function claveNombre(nombre: string): string {
  return nombre.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Prospectos operando o en legalización (ningún broker registrado aparece aquí; sin prospectos, la
 * vista queda vacía). Alta con credenciales generadas, expediente con documentos, SARLAFT, estudios,
 * comisión estimada y actividad, y aprobación con validadores.
 */
@Component({
  selector: 'app-admin-prospectos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AlertBannerComponent,
    BadgeEstadoComponent,
    BitacoraComponent,
    BotonComponent,
    CredencialUnicaComponent,
    DataTableComponent,
    EstadoVistaComponent,
    FichaComponent,
    FormPersonaComponent,
    FormFieldComponent,
    GridLayoutComponent,
    KpiCardComponent,
    ModalDialogComponent,
    PageHeaderComponent,
    VisorArchivoComponent,
    InfoBoxComponent,
  ],
  templateUrl: './prospectos.component.html',
  styleUrls: ['../admin-comun.scss'],
})
export class ProspectosComponent {
  private readonly consola = inject(ConsolaService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly admin = inject(AdminService);
  protected readonly esAdmin = this.admin.esAdmin();
  /** Comerciales activos para reasignar el prospecto (solo el administrador). */
  protected readonly comerciales = signal<readonly ComercialConsola[]>([]);
  protected readonly comercialDestino = signal('');
  protected readonly compacto = copCompacto;
  private readonly catalogo = inject(CatalogoService);
  private readonly feedback = inject(FeedbackService);
  private readonly documentos = this.catalogo.etiquetas('documento_legalizacion');
  private readonly fasesSarlaft = this.catalogo.etiquetas('fase_sarlaft');
  /** La consulta SARLAFT está apagada: el botón «Consultar SARLAFT ahora» no se ofrece. */
  protected readonly consultaSarlaft = consultaSarlaftHabilitada(this.catalogo);
  /** Fase SARLAFT con la descripción del catálogo (`cat_fase_sarlaft`). */
  protected sarlaft(fase: string | null): string {
    return fase ? this.fasesSarlaft[fase] ?? fase : 'Sin consulta';
  }
  private readonly legalizacion = this.catalogo.insignias('estado_registro_broker', VARIANTE_LEGALIZACION, 'info' as VarianteBadge);
  protected readonly etiquetaDocumento = (tipo: string) => this.documentos[tipo] ?? tipo;
  protected readonly fechaHora = fechaHora;

  protected readonly prospectos = signal<readonly ProspectoConsola[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal(false);
  protected readonly mensaje = signal('');

  protected readonly columnas: readonly ColumnaTabla[] = [
    { key: 'prospecto', header: 'Prospecto', tipo: 'principal', ordenable: true },
    { key: 'contacto', header: 'Contacto', tipo: 'principal' },
    { key: 'comercial', header: 'Comercial', ordenable: true },
    { key: 'legalizacion', header: 'Legalización', tipo: 'badge', ordenable: true },
    { key: 'documentos', header: 'Documentos', alinear: 'derecha' },
    { key: 'sarlaft', header: 'SARLAFT', tipo: 'principal' },
    { key: 'estudios', header: 'Estudios', alinear: 'derecha', ordenable: true, nowrap: true },
    { key: 'ingreso', header: 'Ingreso', alinear: 'derecha', ordenable: true },
    { key: 'comision', header: 'Comisión estimada', alinear: 'derecha', ordenable: true, nowrap: true },
    ...COLUMNAS_FECHAS,
    COLUMNA_GESTIONAR,
  ];

  /** Nombres que se repiten con otra cédula: posibles cuentas duplicadas o de prueba para depurar. */
  private readonly nombresRepetidos = computed(() => {
    const cuenta = new Map<string, number>();
    this.prospectos().forEach((p) => cuenta.set(claveNombre(p.nombre), (cuenta.get(claveNombre(p.nombre)) ?? 0) + 1));
    return new Set([...cuenta].filter(([, n]) => n > 1).map(([k]) => k));
  });

  private esDuplicado(nombre: string): boolean {
    return this.nombresRepetidos().has(claveNombre(nombre));
  }

  protected readonly filas = computed<readonly FilaTabla[]>(() =>
    this.prospectos().map((p) => {
      const leg = this.legalizacion[p.estadoLegalizacion] ?? { etiqueta: p.estadoLegalizacion, variante: 'info' as VarianteBadge };
      return {
        prospecto: p.nombre,
        prospectoSub: (p.documento ?? 'sin documento') + (this.esDuplicado(p.nombre) ? ' · Posible duplicado' : ''),
        contacto: p.correo ?? '—',
        contactoSub: p.celular ?? '',
        comercial: p.comercialNombre ?? 'Sin asignar',
        legalizacion: leg.etiqueta,
        legalizacionVariante: leg.variante,
        documentos: `${p.documentosCargados} de 4`,
        sarlaft: this.sarlaft(p.sarlaftEstado),
        sarlaftSub: p.sarlaftFecha ? fechaHora(p.sarlaftFecha) : '',
        estudios: p.estudios,
        ingreso: cop(p.primas),
        ingresoOrden: p.primas,
        comision: cop(p.comisionEnCurso),
        comisionOrden: p.comisionEnCurso,
        ...celdasFechas(p.creado, p.ultimoMovimiento),
        gestionar: '',
      };
    }),
  );

  protected readonly enLegalizacion = computed(() => this.prospectos().filter((p) => p.estadoLegalizacion === 'EN_REVISION').length);
  protected readonly totalEstudios = computed(() => this.prospectos().reduce((t, p) => t + p.estudios, 0));
  protected readonly totalComision = computed(() => this.prospectos().reduce((t, p) => t + p.comisionEnCurso, 0));

  // --- Alta con credenciales ---
  protected readonly creando = signal(false);
  protected readonly enviandoAlta = signal(false);
  protected readonly errorAlta = signal('');
  protected readonly credencial = signal<CredencialGenerada | null>(null);

  // --- Expediente ---
  protected readonly expediente = signal<ExpedienteProspecto | null>(null);
  protected readonly cargandoExpediente = signal(false);
  protected readonly pestana = signal('expediente');
  protected readonly pestanas = computed<readonly Tab[]>(() => [
    { id: 'expediente', etiqueta: 'Expediente' },
    { id: 'documentos', etiqueta: `Documentos (${this.expediente()?.documentos.length ?? 0})` },
    { id: 'actividad', etiqueta: 'Actividad' },
    // El comercial ve qué le falta al prospecto para ayudarle (auditoría de producción PR41); aprobar es del administrador.
    ...(this.esAdmin ? [{ id: 'decision', etiqueta: 'Aprobación' }] : [{ id: 'pendiente', etiqueta: 'Qué le falta' }]),
  ]);
  protected readonly documentoAbierto = signal<DocumentoExpediente | null>(null);
  protected readonly archivo = signal<Blob | null>(null);
  protected readonly cargandoArchivo = signal(false);
  protected readonly decidiendo = signal(false);
  /** Decisión pendiente de confirmar (segundo clic): evita aprobar o rechazar por un clic accidental. */
  protected readonly confirmando = signal<'aprobar' | 'rechazar' | null>(null);
  protected readonly errorDecision = signal('');
  protected readonly faltantes = computed(() => (this.expediente()?.faltantes ?? []).map((f) => faltante(f, this.documentos)));

  protected readonly ficha = computed<readonly SeccionFicha[]>(() => {
    const p = this.expediente()?.prospecto;
    if (!p) return [];
    return [
      {
        titulo: 'Datos del prospecto',
        icono: 'person_search',
        datos: [
          { etiqueta: 'Nombre', valor: p.nombre },
          { etiqueta: 'Documento', valor: p.documento },
          { etiqueta: 'Correo', valor: p.correo },
          { etiqueta: 'Celular', valor: p.celular },
          { etiqueta: 'Comercial asignado', valor: p.comercialNombre ?? 'Sin asignar' },
          { etiqueta: 'Legalización', valor: (this.legalizacion[p.estadoLegalizacion] ?? { etiqueta: p.estadoLegalizacion }).etiqueta },
        ],
      },
      {
        titulo: 'Conocimiento del cliente (SARLAFT)',
        icono: 'policy',
        datos: [
          { etiqueta: 'Estado', valor: this.sarlaft(p.sarlaftEstado) },
          { etiqueta: 'Última actualización', valor: fechaHora(p.sarlaftFecha) },
        ],
      },
      {
        titulo: 'Lo que ha hecho en el portal',
        icono: 'query_stats',
        datos: [
          { etiqueta: 'Estudios realizados', valor: p.estudios },
          { etiqueta: 'Negocios radicados', valor: p.negocios },
          { etiqueta: 'Ingreso por pólizas expedidas', valor: cop(p.primas) },
          { etiqueta: 'Comisión estimada', valor: cop(p.comisionEnCurso), destacado: true },
          { etiqueta: 'Documentos cargados', valor: `${p.documentosCargados} de 4` },
          { etiqueta: 'Creado', valor: fechaHora(p.creado) },
          { etiqueta: 'Último movimiento', valor: fechaHora(p.ultimoMovimiento ?? p.creado) },
        ],
      },
    ];
  });

  constructor() {
    this.cargar();
    if (this.esAdmin) {
      this.consola
        .comerciales()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (c) => this.comerciales.set(c.filter((x) => x.activo)), error: () => this.comerciales.set([]) });
    }
  }

  /** Reasigna el prospecto (y sus negocios) a otro comercial: misma acción que en Brokers. */
  protected reasignarComercial(): void {
    const p = this.expediente()?.prospecto;
    const destino = this.comerciales().find((c) => c.codigo === this.comercialDestino());
    if (!p || !destino) return;
    this.feedback.info({
      titulo: 'Reasignar comercial',
      mensaje: `${p.nombre} y sus negocios pasarán a ${destino.nombre}. El cambio queda registrado en su actividad y en el historial de cada negocio.`,
      acciones: { confirmar: 'Reasignar', cancelar: 'Cancelar' },
      alResolver: (r) => {
        if (r === 'confirmar') this.ejecutarReasignacion(p, destino);
      },
    });
  }

  private ejecutarReasignacion(p: { id: string; nombre: string }, destino: { codigo: string; nombre: string }): void {
    this.decidiendo.set(true);
    this.errorDecision.set('');
    this.admin
      .asignarComercial(p.id, destino.codigo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.decidiendo.set(false);
          this.expediente.set(null);
          this.comercialDestino.set('');
          this.mensaje.set(`${p.nombre} pasó a ${destino.nombre}.`);
          this.cargar();
        },
        error: (err: unknown) => {
          this.decidiendo.set(false);
          this.errorDecision.set(mensajeErrorIntegracion(err));
        },
      });
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.consola
      .prospectos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.prospectos.set(p);
          this.cargando.set(false);
        },
        error: () => {
          this.prospectos.set([]);
          this.cargando.set(false);
          this.error.set(true);
        },
      });
  }

  // --- Alta ---
  protected abrirAlta(): void {
    this.creando.set(true);
    this.credencial.set(null);
    this.errorAlta.set('');
  }

  protected crear(datos: PersonaRequest): void {
    this.enviandoAlta.set(true);
    this.errorAlta.set('');
    this.consola
      .crearProspecto(datos)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (alta) => {
          this.enviandoAlta.set(false);
          this.credencial.set(alta.credencial);
          this.mensaje.set(`Prospecto ${datos.nombre} creado y asignado automáticamente a un comercial.`);
          this.cargar();
        },
        error: (err: unknown) => {
          this.enviandoAlta.set(false);
          this.errorAlta.set(mensajeErrorIntegracion(err));
        },
      });
  }

  protected cerrarAlta(): void {
    this.creando.set(false);
    this.credencial.set(null);
  }

  // --- Expediente ---
  protected gestionar(evento: AccionFila): void {
    const p = this.prospectos().at(evento.indice);
    if (!p) return;
    this.pestana.set('expediente');
    this.documentoAbierto.set(null);
    this.archivo.set(null);
    this.errorDecision.set('');
    this.cargarExpediente(p.id);
  }

  private cargarExpediente(id: string): void {
    this.cargandoExpediente.set(true);
    this.consola
      .expediente(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (e) => {
          this.expediente.set(e);
          this.cargandoExpediente.set(false);
        },
        error: (err: unknown) => {
          this.cargandoExpediente.set(false);
          this.mensaje.set('');
          this.errorDecision.set(mensajeErrorIntegracion(err));
        },
      });
  }

  /** Prospecto duplicado o de prueba: se desactiva (sale de las listas y no puede ingresar), con confirmación. */
  protected desactivar(): void {
    const e = this.expediente();
    if (!e) return;
    this.feedback.info({
      titulo: 'Desactivar prospecto',
      mensaje: `${e.prospecto.nombre} dejará de aparecer en la consola y no podrá ingresar al portal. Su historial se conserva.`,
      acciones: { confirmar: 'Desactivar', cancelar: 'Cancelar' },
      alResolver: (r) => {
        if (r !== 'confirmar') return;
        this.consola.desactivarProspecto(e.prospecto.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: () => {
            this.feedback.toast({ variante: 'exito', mensaje: 'Prospecto desactivado.' });
            this.expediente.set(null);
            this.cargar();
          },
          error: (err: unknown) => this.feedback.toast({ variante: 'error', mensaje: mensajeErrorIntegracion(err) }),
        });
      },
    });
  }

  protected cerrarExpediente(): void {
    this.expediente.set(null);
    this.archivo.set(null);
  }

  protected verDocumento(doc: DocumentoExpediente): void {
    const id = this.expediente()?.prospecto.id;
    if (!id) return;
    this.documentoAbierto.set(doc);
    this.archivo.set(null);
    this.cargandoArchivo.set(true);
    this.consola
      .archivoProspecto(id, doc.archivoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (b) => {
          this.archivo.set(b);
          this.cargandoArchivo.set(false);
        },
        error: () => this.cargandoArchivo.set(false),
      });
  }

  protected consultarSarlaft(): void {
    const p = this.expediente()?.prospecto;
    if (!p) return;
    this.decidiendo.set(true);
    this.errorDecision.set('');
    this.consola
      .consultarSarlaftProspecto(p.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.decidiendo.set(false);
          this.cargarExpediente(p.id);
        },
        error: (err: unknown) => {
          this.decidiendo.set(false);
          this.errorDecision.set(mensajeErrorIntegracion(err));
        },
      });
  }

  protected decidir(aprobar: boolean): void {
    const accion = aprobar ? 'aprobar' : 'rechazar';
    if (this.confirmando() !== accion) {
      this.confirmando.set(accion);
      return;
    }
    this.confirmando.set(null);
    const p = this.expediente()?.prospecto;
    if (!p) return;
    this.decidiendo.set(true);
    this.errorDecision.set('');
    (aprobar ? this.consola.aprobarProspecto(p.id) : this.consola.rechazarProspecto(p.id))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.decidiendo.set(false);
          this.expediente.set(null);
          this.mensaje.set(
            aprobar
              ? `${p.nombre} quedó como broker registrado: ya aparece en Brokers y accede a sus comisiones.`
              : `La legalización de ${p.nombre} quedó rechazada; sigue como prospecto.`,
          );
          this.cargar();
        },
        error: (err: unknown) => {
          this.decidiendo.set(false);
          this.errorDecision.set(mensajeErrorIntegracion(err));
        },
      });
  }
}
