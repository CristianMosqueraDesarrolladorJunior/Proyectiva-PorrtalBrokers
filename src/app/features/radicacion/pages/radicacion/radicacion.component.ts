import { abrirFormularioSarlaft } from '../../../../core/util/sarlaft-enlace';
import { concat, of, switchMap, toArray, type Observable } from 'rxjs';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  documentosRequeridosRadicacion,
  type ResultadoEstudioArrendamiento,
  type ResultadoSarlaftRadicacion,
  type TipoDocumentoIdentidad,
  type TipoDocumentoRadicacion,
  type TipoPersona,
} from '../../../../core/models/radicacion.model';
import { RadicacionService } from '../../../../core/services/radicacion.service';
import { BorradorRadicacionService } from '../../../../core/services/borrador-radicacion.service';
import { formatearCop } from '../../../../shared/util/moneda';
import { mensajeErrorIntegracion } from '../../../../core/util/errores-integracion';
import { reglaDesdeCatalogo, validarDocumento } from '../../../../shared/validation/documento-validacion';
import { CatalogoService } from '../../../../core/services/catalogo.service';
import { ContratoService } from '../../../../core/services/contrato.service';
import type { LecturaContratoResponse } from '../../../../core/models/contrato.model';
import { LectorContratoComponent } from '../../../contrato/components/lector-contrato/lector-contrato.component';
import { contratoDesdeLectura } from './contrato-desde-lectura';
import {
  AlertBannerComponent,
  BotonComponent,
  DocUploaderComponent,
  FormFieldComponent,
  InfoBoxComponent,
  ToggleSwitchComponent,
  RadioGroupComponent,
  TabsComponent,
  PageHeaderComponent,
  FormSectionCardComponent,
  StepTabsComponent,
  SummaryCardComponent,
  StickyActionsComponent,
  ModalDialogComponent,
  InfoTipComponent,
} from '../../../../shared/components';
import type { FilaResumen } from '../../../../shared/components';
import type { OpcionRadio } from '../../../../shared/components/radio-group/radio-group.component';
import type {
  ArchivoSeleccionado,
  ReglaDocumentoUploader,
} from '../../../../shared/components/doc-uploader/doc-uploader.component';
import type { Tab } from '../../../../shared/components/tabs/tabs.component';
import {
  claveConsultaSarlaft,
  construirPayloadRadicacion,
  documentosObligatoriosFaltantes,
  esNumeroDocumentoPropietarioValido,
  etiquetasDocumentos,
  inmuebleSinCobertura,
  PASOS_RADICACION,
  pasoActivoRadicacion,
  permiteCargarDocumentos,
  puedeConsultarSarlaftRadicacion,
  puedeEnviarRadicacion,
  sujetoSarlaft,
  validarDatosRadicacion,
} from './radicacion-presentacion';
import { SoloDigitosDirective } from '../../../../shared/directives/solo-digitos.directive';
import { FeedbackService } from '../../../../shared/services/feedback/feedback.service';

/** Documento opcional que también puede cargarse en la radicación (Req 11.3). */
const DOCUMENTO_OPCIONAL: TipoDocumentoRadicacion = 'contratoArrendamientoFirmado';

/**
 * RadicacionComponent — Sección Radicación del Portal (Req 10, 11, 12).
 *
 * Captura los datos base de la radicación (`RadicacionRequest`: tipo y número de
 * documento del propietario y número de estudio de arrendamiento aprobado, Req 10.1),
 * alterna Persona Natural / Persona Jurídica con `TabsComponent` (Req 10.3, 10.4),
 * permite marcar el caso apoderado (Req 10.2) y deriva el conjunto de documentos
 * obligatorios con `documentosRequeridosRadicacion()`; los documentos se cargan con
 * `DocUploaderComponent` (Req 11.1, 11.2, 11.3, 12.3).
 *
 * Paso 4 (flujo 02): SARLAFT se consulta a quien firma (el apoderado si lo hay; si
 * no, el propietario). La API tiene 3 salidas. `actualizado` habilita la carga
 * de documentos; `desactualizado` envía una URL al firmante (propietario/apoderado)
 * y exige reconsultar; `consultable` deja el caso en el Warehouse y termina el
 * trámite en el portal.
 *
 * El envío se impide mientras falten documentos obligatorios, indicando los
 * pendientes (Req 11.4); el contrato de arrendamiento firmado es opcional (Req 11.3).
 * El botón "Crear contrato" abre el flujo del Generador_Contrato (Req 11.5). La
 * validación de MIME/tamaño/vigencia es lógica pura reutilizada; el backend revalida
 * siempre (Req 10.5, 13.5) — no hay lógica autoritativa en el frontend.
 *
 * Reutiliza componentes compartidos sin duplicar marcado (Req 24.4, 35.21).
 */
@Component({
  selector: 'app-radicacion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SoloDigitosDirective, 
    FormsModule,
    TabsComponent,
    RadioGroupComponent,
    DocUploaderComponent,
    FormFieldComponent,
    BotonComponent,
    AlertBannerComponent,
    InfoBoxComponent,
    ToggleSwitchComponent,
    PageHeaderComponent,
    FormSectionCardComponent,
    StepTabsComponent,
    SummaryCardComponent,
    StickyActionsComponent,
    ModalDialogComponent,
    InfoTipComponent,
    LectorContratoComponent,
  ],
  templateUrl: './radicacion.component.html',
  styleUrl: './radicacion.component.scss',
})
export class RadicacionComponent {
  private readonly feedback = inject(FeedbackService);
  private readonly radicacionService = inject(RadicacionService);
  private readonly router = inject(Router);
  private readonly borrador = inject(BorradorRadicacionService);

  /** Cotización elegida en "Radicar esta cotización" (solo lectura en esta pantalla). */
  protected readonly cotizacion = this.borrador.cotizacion;
  /** Contrato generado: toda radicación lo exige. */
  protected readonly contratoReferencia = computed(() => this.borrador.contrato()?.referencia ?? null);
  /** El contrato declara el inmueble en leasing: el permiso de subarriendo pasa a ser obligatorio. */
  protected readonly contratoConLeasing = computed(() => this.borrador.contrato()?.leasing === true);
  /** Declaración de autorización de tratamiento de datos (Habeas Data), exigida por el backend. */
  protected readonly autorizacionDatos = signal(false);
  /** Observación del broker para el área (columna "Observaciones Usuario Radicación" del Consolidado). */
  protected readonly observaciones = signal('');
  protected readonly formatearCop = formatearCop;

  /** Pestañas de tipo de persona (Persona Natural / Persona Jurídica) (Req 10.3, 10.4). */
  protected readonly tabs: readonly Tab[] = [
    { id: 'natural', etiqueta: 'Persona Natural' },
    { id: 'juridica', etiqueta: 'Persona Jurídica' },
  ];

  /** Opciones del firmante del contrato (Propietario / Apoderado), fiel al prototipo (Req 10.2). */
  protected readonly opcionesFirmante: readonly OpcionRadio[] = [
    { valor: 'propietario', etiqueta: 'Propietario' },
    { valor: 'apoderado', etiqueta: 'Apoderado' },
  ];

  protected readonly catalogo = inject(CatalogoService);

  /** Tipos de documento del propietario y del apoderado (catálogo `tipo_documento`, Req 10.1). */
  protected readonly tiposDocumento = this.catalogo.codigos<TipoDocumentoIdentidad>('tipo_documento', 'propietario');
  protected readonly tiposDocumentoApoderado = this.catalogo.codigos<TipoDocumentoIdentidad>('tipo_documento', 'apoderado');
  protected readonly etiquetaTipoDocumento = this.catalogo.etiquetas('tipo_documento');

  /** Documentos de radicación (catálogo `documento_radicacion`): etiquetas, ayudas, reglas y a quién aplican. */
  private readonly documentosCatalogo = this.catalogo.opciones('documento_radicacion');
  private readonly etiquetaDocumento = this.catalogo.etiquetas('documento_radicacion');

  // --- Estado de los datos base de la radicación (Req 10.1) ---
  protected readonly tipoDocumentoPropietario = signal<TipoDocumentoIdentidad>('CC');
  protected readonly numeroDocumentoPropietario = signal('');
  protected readonly numeroEstudioArrendamiento = signal('');

  // --- Paso 2: consulta del Estudio Digital del Libertador (inquilino) ---
  /** Documento/cédula del inquilino, requerido junto al número de estudio para consultar. */
  protected readonly documentoInquilino = signal('');
  /** Tipo de documento del inquilino (catálogo `tipo_documento`): una empresa arrienda con NIT. */
  protected readonly tipoDocumentoInquilino = signal<TipoDocumentoIdentidad>('CC');
  protected readonly tiposDocumentoInquilino = this.catalogo.codigos<TipoDocumentoIdentidad>('tipo_documento');
  /** Consulta de estudio en curso. */
  protected readonly consultandoEstudio = signal(false);
  /** Resultado del estudio consultado (autollena el contrato). */
  protected readonly resultadoEstudio = signal<ResultadoEstudioArrendamiento | null>(null);
  /** Error técnico de la consulta de estudio. */
  protected readonly errorEstudio = signal<string | null>(null);

  /** El estudio consultado está aprobado: habilita continuar. */
  protected readonly estudioAprobado = computed(
    () => this.resultadoEstudio()?.estado === 'APROBADO',
  );

  /** Habilita el botón de consulta de estudio: número + cédula del inquilino presentes. */
  protected readonly puedeConsultarEstudio = computed(
    () =>
      /^\d{4,15}$/.test(this.numeroEstudioArrendamiento().trim()) &&
      esNumeroDocumentoPropietarioValido(this.documentoInquilino().trim()) &&
      !this.consultandoEstudio(),
  );

  // --- Estado del tipo de persona y opciones condicionales (Req 10.2, 10.3, 12.1) ---
  protected readonly tipoPersona = signal<TipoPersona>('natural');
  protected readonly firmaApoderado = signal(false);

  // --- Identificación del apoderado: a él se le consulta SARLAFT ---
  protected readonly tipoDocumentoApoderado = signal<TipoDocumentoIdentidad>('CC');
  protected readonly numeroDocumentoApoderado = signal('');
  /** Correo del apoderado: va a la columna "Correo Apoderado" del Consolidado. */
  protected readonly correoApoderado = signal('');
  protected readonly sarlaftRequiereFormulario = signal(false);
  /** La consulta SARLAFT falló (servicio caído): se permite seguir con el SARLAFT físico. */
  protected readonly sarlaftNoDisponible = signal(false);

  /**
   * Celular de quien firma (propietario/apoderado): destino del SMS de la URL de Conocimiento de
   * Cliente cuando SARLAFT exige generarla (fase 2). Se envía al servicio de generar URL vía MS.
   */
  protected readonly telefonoSarlaft = signal('');

  /**
   * Documentos cargados: mapa tipo -> nombre de archivo (para el uploader) y
   * mapa tipo -> resultado de validación (para bloquear inválidos).
   */
  protected readonly archivosCargados = signal<Readonly<Record<string, string>>>({});

  /** Archivos elegidos (en memoria): se suben al radicar; el borrador solo guarda sus nombres. */
  private readonly archivos = new Map<TipoDocumentoRadicacion, File>();
  private readonly tiposValidos = signal<ReadonlySet<TipoDocumentoRadicacion>>(new Set());

  /** Radicado devuelto por el backend tras un envío exitoso (Req 10, 11). */
  protected readonly radicado = signal<string | null>(null);
  /** Radicación ya creada que aún no llegó al área (falló la carga o el envío): el reintento la reutiliza. */
  private readonly radicadoPendiente = signal<string | null>(null);
  /** Se volvió a la pantalla (p. ej. desde Contratos): los archivos no se conservan y hay que adjuntarlos de nuevo. */
  protected readonly readjuntarDocumentos = signal(false);

  /** Indicador de envío en curso. */
  protected readonly enviando = signal(false);

  // --- Paso 4: Validación SARLAFT (3 salidas del flujo 02) ---

  /** Último resultado de la API SARLAFT y a quién se consultó. */
  private readonly consultaSarlaft = signal<{
    readonly clave: string;
    readonly resultado: ResultadoSarlaftRadicacion;
  } | null>(null);

  /** Consulta SARLAFT en curso. */
  protected readonly consultandoSarlaft = signal(false);

  /** Error técnico de la consulta SARLAFT (no es una salida del flujo). */
  protected readonly errorSarlaft = signal<string | null>(null);

  /** Confirmación visual tras copiar el enlace de actualización. */
  protected readonly enlaceCopiado = signal(false);

  /** A quién se consulta SARLAFT: al apoderado si firma él; si no, al propietario. */
  protected readonly sujetoSarlaft = computed(() => sujetoSarlaft(this.firmaApoderado()));

  /** Nombre legible de la persona consultada para los textos de la UI. */
  protected readonly etiquetaSujetoSarlaft = computed(() => {
    if (this.sujetoSarlaft() === 'apoderado') {
      return 'apoderado';
    }
    return this.tipoPersona() === 'natural' ? 'propietario' : 'representante de la empresa';
  });

  /** Documento de la persona consultada en SARLAFT. */
  private readonly documentoSarlaft = computed(() =>
    this.sujetoSarlaft() === 'apoderado'
      ? { tipo: this.tipoDocumentoApoderado(), numero: this.numeroDocumentoApoderado() }
      : { tipo: this.tipoDocumentoPropietario(), numero: this.numeroDocumentoPropietario() },
  );

  /** Clave de la consulta que corresponde a lo que hay en pantalla. */
  private readonly claveSarlaftActual = computed(() =>
    claveConsultaSarlaft(
      this.sujetoSarlaft(),
      this.documentoSarlaft().tipo,
      this.documentoSarlaft().numero,
      this.tipoPersona(),
    ),
  );

  /**
   * Resultado SARLAFT vigente: solo aplica si se consultó a la misma persona
   * (firmante y documento) con el mismo tipo de persona; si cambian, hay que
   * reconsultar.
   */
  protected readonly resultadoSarlaft = computed<ResultadoSarlaftRadicacion | null>(() => {
    const consulta = this.consultaSarlaft();
    return consulta && consulta.clave === this.claveSarlaftActual() ? consulta.resultado : null;
  });

  /** Estado SARLAFT vigente, o `null` si aún no se consulta. */
  protected readonly estadoSarlaft = computed(() => this.resultadoSarlaft()?.estado ?? null);

  /**
   * Salida 1: la carga de documentos se habilita con SARLAFT actualizado, o desactualizado con el SARLAFT físico
   * (el formulario pasa a ser obligatorio en la lista y lo revisa el área; el backend aplica la misma regla).
   */
  protected readonly documentosHabilitados = computed(() =>
    permiteCargarDocumentos(this.estadoSarlaft()) || this.conSarlaftFisico(),
  );

  /** Se puede ofrecer el SARLAFT físico: firmante desactualizado o consulta no disponible. */
  protected readonly ofreceSarlaftFisico = computed(
    () => this.estadoSarlaft() === 'DESACTUALIZADO' || (this.estadoSarlaft() === null && this.sarlaftNoDisponible()),
  );

  /** El broker eligió cargar el SARLAFT físico (desactualizado o SARLAFT caído). */
  protected readonly conSarlaftFisico = computed(
    () => this.ofreceSarlaftFisico() && this.sarlaftRequiereFormulario(),
  );

  /** "Cargar SARLAFT físico": habilita los documentos con el formulario SARLAFT obligatorio. */
  protected elegirSarlaftFisico(): void {
    this.sarlaftRequiereFormulario.set(true);
  }

  /** Salida 3: el caso es consultable y el trámite termina en el Warehouse. */
  protected readonly casoConsultable = computed(() =>
    this.estadoSarlaft() === 'CONSULTABLE' ? this.resultadoSarlaft() : null,
  );

  /**
   * Datos completos para consultar: propietario, estudio, teléfono del firmante y, si aplica,
   * documento del apoderado. El teléfono es necesario para la fase 2 (generar URL por SMS).
   */
  protected readonly datosSarlaftCompletos = computed(() =>
    puedeConsultarSarlaftRadicacion(
      this.datosValidos(),
      this.firmaApoderado(),
      this.numeroDocumentoApoderado(),
    ) && this.telefonoSarlaft().trim().length >= 7
      && (!this.firmaApoderado() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.correoApoderado().trim())),
  );

  /** Habilita el botón de consulta SARLAFT. */
  protected readonly puedeConsultarSarlaft = computed(
    () => this.datosSarlaftCompletos() && !this.consultandoSarlaft(),
  );

  /** Conjunto obligatorio de documentos según la selección actual (Req 11, 12). */
  private readonly obligatorios = computed<readonly TipoDocumentoRadicacion[]>(() =>
    documentosRequeridosRadicacion({
      tipoPersona: this.tipoPersona(),
      firmaApoderado: this.firmaApoderado(),
      sarlaftRequiereFormulario: this.sarlaftRequiereFormulario(),
      requierePermisoSubarriendo: this.contratoConLeasing(),
      documentos: this.documentosCatalogo,
    }),
  );

  /** Documentos del apoderado, mostrados en su sección (catálogo, `aplica = APODERADO`, Req 10.2). */
  private readonly tiposApoderado = this.documentosCatalogo
    .filter((d) => d['aplica'] === 'APODERADO')
    .map((d) => d.codigo as TipoDocumentoRadicacion);

  /** Reglas del uploader para los documentos del apoderado (Req 10.2). */
  protected readonly reglasApoderado = computed<readonly ReglaDocumentoUploader[]>(() =>
    this.firmaApoderado()
      ? this.tiposApoderado.map((tipo) => this.reglaUploader(tipo, true))
      : [],
  );

  /**
   * Reglas del uploader para los documentos obligatorios por tipo de persona y
   * SARLAFT condicional, EXCLUYENDO los del apoderado (que van en su sección) (Req 35.7).
   */
  protected readonly reglasObligatorias = computed<readonly ReglaDocumentoUploader[]>(() =>
    this.obligatorios()
      .filter((tipo) => !this.tiposApoderado.includes(tipo))
      .map((tipo) => this.reglaUploader(tipo, true)),
  );

  /** Regla del uploader para el contrato de arrendamiento firmado (opcional) (Req 11.3). */
  protected readonly reglaOpcional: ReglaDocumentoUploader = this.reglaUploader(
    DOCUMENTO_OPCIONAL,
    false,
  );

  /** Validez de los datos base de la radicación (Req 10.1): sin estudio APROBADO el paso no se completa. */
  protected readonly datosValidos = computed(
    () =>
      validarDatosRadicacion(
        this.numeroDocumentoPropietario(),
        this.numeroEstudioArrendamiento(),
      ).datosValidos && this.estudioAprobado(),
  );

  /** Tipos obligatorios que ya tienen un archivo válido cargado. */
  private readonly cargadosValidos = computed<readonly TipoDocumentoRadicacion[]>(() => {
    const validos = this.tiposValidos();
    return this.obligatorios().filter((tipo) => validos.has(tipo));
  });

  /** Documentos obligatorios pendientes de cargar (Req 11.4). */
  protected readonly faltantes = computed(() =>
    documentosObligatoriosFaltantes(
      {
        tipoPersona: this.tipoPersona(),
        firmaApoderado: this.firmaApoderado(),
        sarlaftRequiereFormulario: this.sarlaftRequiereFormulario(),
        requierePermisoSubarriendo: this.contratoConLeasing(),
        documentos: this.documentosCatalogo,
      },
      this.cargadosValidos(),
    ),
  );

  /** Etiquetas legibles de los documentos pendientes para el mensaje de UI (Req 11.4). */
  protected readonly etiquetasFaltantes = computed(() =>
    etiquetasDocumentos(this.faltantes(), this.etiquetaDocumento),
  );

  /**
   * Habilitación del envío: estudio APROBADO, SARLAFT actualizado y documentos
   * completos (Req 11.4). Un estudio NO_APROBADO (rechazado) o PENDIENTE (en trámite)
   * bloquea la radicación: no se puede radicar una póliza sin estudio aprobado.
   */
  protected readonly envioHabilitado = computed(() =>
    this.autorizacionDatos() &&
    this.contratoReferencia() !== null &&
    this.estudioAprobado() &&
    this.documentosHabilitados() &&
    puedeEnviarRadicacion(
      {
        tipoPersona: this.tipoPersona(),
        firmaApoderado: this.firmaApoderado(),
        sarlaftRequiereFormulario: this.sarlaftRequiereFormulario(),
        requierePermisoSubarriendo: this.contratoConLeasing(),
        documentos: this.documentosCatalogo,
      },
      this.cargadosValidos(),
      this.datosValidos(),
    ),
  );

  /** Pasos del avance de la radicación (solo presentación; se deriva del estado real). */
  protected readonly pasos = PASOS_RADICACION;

  protected readonly pasoActivo = computed(() =>
    pasoActivoRadicacion(
      this.contratoReferencia() !== null,
      this.datosSarlaftCompletos(),
      this.estadoSarlaft(),
      this.faltantes().length,
    ),
  );

  protected readonly totalObligatorios = computed(() => this.reglasObligatorias().length);

  protected readonly cargadosObligatorios = computed(
    () => this.totalObligatorios() - this.faltantes().length,
  );

  /** Checklist lateral: refleja en vivo qué falta para poder enviar. */
  protected readonly filasProgreso = computed<FilaResumen[]>(() => [
    {
      label: 'Datos del propietario',
      valor: this.numeroDocumentoPropietario().trim().length > 0 ? 'Ingresados' : 'Pendiente',
    },
    {
      label: 'Estudio de arrendamiento',
      valor: this.numeroEstudioArrendamiento().trim().length > 0 ? 'Ingresado' : 'Pendiente',
    },
    { label: 'Firmante', valor: this.firmaApoderado() ? 'Apoderado' : 'Propietario' },
    {
      label: this.firmaApoderado() ? 'Conocimiento de Cliente (apoderado)' : 'Conocimiento de Cliente',
      valor: this.estadoSarlaft()
        ? this.catalogo.etiqueta('sarlaft_resultado', this.estadoSarlaft()!.toLowerCase())
        : 'Sin consultar',
    },
    {
      label: 'Tipo de persona',
      valor: this.tipoPersona() === 'natural' ? 'Natural' : 'Jurídica',
    },
  ]);

  /** ¿Hay avance que se perdería al cancelar? */
  protected readonly hayAvance = computed(
    () =>
      this.numeroDocumentoPropietario().trim().length > 0 ||
      this.numeroEstudioArrendamiento().trim().length > 0 ||
      this.numeroDocumentoApoderado().trim().length > 0 ||
      Object.keys(this.archivosCargados()).length > 0,
  );

  protected readonly confirmarCancelar = signal(false);

  constructor() {
    this.restaurarBorrador(this.borrador.formulario() as Record<string, never> | null);
    this.precargarDesdeContrato();
    // Contrato firmado cargado en Contratación: se adjunta aquí como documento de la radicación.
    const firmado = this.borrador.archivoContratoFirmado();
    if (firmado) {
      this.onContratoFirmado(firmado);
      this.borrador.archivoContratoFirmado.set(null);
    }
    // Todo cambio del formulario queda en el borrador: al volver del contrato no se pierde nada.
    effect(() => this.borrador.formulario.set(this.instantanea()));
  }

  /** Estado del formulario serializable (sin archivos binarios: solo nombres y tipos válidos). */
  private instantanea(): Readonly<Record<string, unknown>> {
    return {
      tipoDocumentoPropietario: this.tipoDocumentoPropietario(),
      numeroDocumentoPropietario: this.numeroDocumentoPropietario(),
      numeroEstudioArrendamiento: this.numeroEstudioArrendamiento(),
      documentoInquilino: this.documentoInquilino(),
      resultadoEstudio: this.resultadoEstudio(),
      tipoPersona: this.tipoPersona(),
      firmaApoderado: this.firmaApoderado(),
      tipoDocumentoApoderado: this.tipoDocumentoApoderado(),
      numeroDocumentoApoderado: this.numeroDocumentoApoderado(),
      correoApoderado: this.correoApoderado(),
      sarlaftRequiereFormulario: this.sarlaftRequiereFormulario(),
      // Sin esto, al volver de Contratos con SARLAFT caído se pierde la salida del SARLAFT físico y los documentos se bloquean.
      sarlaftNoDisponible: this.sarlaftNoDisponible(),
      telefonoSarlaft: this.telefonoSarlaft(),
      consultaSarlaft: this.consultaSarlaft(),
      // Los archivos no se pueden guardar en el borrador: solo se recuerda que hubo documentos para pedirlos de nuevo.
      habiaDocumentos: Object.keys(this.archivosCargados()).length > 0 || this.readjuntarDocumentos(),
      radicadoPendiente: this.radicadoPendiente(),
      autorizacionDatos: this.autorizacionDatos(),
    };
  }

  /** Repone el formulario desde el borrador; con `{}` lo deja en blanco (nueva radicación). */
  private restaurarBorrador(f: Record<string, never> | null): void {
    if (!f) {
      return;
    }
    this.tipoDocumentoPropietario.set(f['tipoDocumentoPropietario'] ?? 'CC');
    this.numeroDocumentoPropietario.set(f['numeroDocumentoPropietario'] ?? '');
    this.numeroEstudioArrendamiento.set(f['numeroEstudioArrendamiento'] ?? '');
    this.documentoInquilino.set(f['documentoInquilino'] ?? '');
    this.resultadoEstudio.set(f['resultadoEstudio'] ?? null);
    this.tipoPersona.set(f['tipoPersona'] ?? 'natural');
    this.firmaApoderado.set(f['firmaApoderado'] ?? false);
    this.tipoDocumentoApoderado.set(f['tipoDocumentoApoderado'] ?? 'CC');
    this.numeroDocumentoApoderado.set(f['numeroDocumentoApoderado'] ?? '');
    this.correoApoderado.set(f['correoApoderado'] ?? '');
    this.sarlaftRequiereFormulario.set(f['sarlaftRequiereFormulario'] ?? false);
    this.sarlaftNoDisponible.set(f['sarlaftNoDisponible'] ?? false);
    this.telefonoSarlaft.set(f['telefonoSarlaft'] ?? '');
    this.consultaSarlaft.set(f['consultaSarlaft'] ?? null);
    // Sin los archivos no hay documentos válidos: se marcan para adjuntar de nuevo (antes se mostraban como
    // cargados y el envío creaba la radicación sin documentos → 422 documentos_incompletos en el Warehouse).
    this.archivos.clear();
    this.archivosCargados.set({});
    this.tiposValidos.set(new Set());
    this.readjuntarDocumentos.set(Boolean(f['habiaDocumentos']) || Object.keys(f['archivosCargados'] ?? {}).length > 0);
    this.radicadoPendiente.set(f['radicadoPendiente'] ?? null);
    this.autorizacionDatos.set(f['autorizacionDatos'] ?? false);
  }

  /** Con el contrato del flujo (generado en Contratación): propietario, inquilino y estudio, solo si están vacíos. */
  private precargarDesdeContrato(): void {
    const contrato = this.borrador.contrato();
    if (!contrato) {
      return;
    }
    const tipo = (t: string | undefined): TipoDocumentoIdentidad | null =>
      t === 'CC' || t === 'CE' || t === 'NIT' || t === 'PA' ? t : null;
    if (contrato.propietario?.numeroDocumento && !this.numeroDocumentoPropietario().trim()) {
      this.numeroDocumentoPropietario.set(contrato.propietario.numeroDocumento);
      this.tipoDocumentoPropietario.set(tipo(contrato.propietario.tipoDocumento) ?? this.tipoDocumentoPropietario());
    }
    if (contrato.inquilino?.numeroDocumento && !this.documentoInquilino().trim()) {
      this.documentoInquilino.set(contrato.inquilino.numeroDocumento);
      this.tipoDocumentoInquilino.set(tipo(contrato.inquilino.tipoDocumento) ?? this.tipoDocumentoInquilino());
    }
    if (contrato.numeroEstudio && !this.numeroEstudioArrendamiento().trim()) {
      this.numeroEstudioArrendamiento.set(contrato.numeroEstudio);
    }
  }

  /** Tras radicar: deja la pantalla lista para una nueva radicación (sin borrador ni datos anteriores). */
  protected nuevaRadicacion(): void {
    this.borrador.limpiar();
    this.restaurarBorrador({});
    this.observaciones.set('');
    this.readjuntarDocumentos.set(false);
    this.firmaContratoCargado.set('');
    this.radicado.set(null);
  }

  protected cancelar(): void {
    if (this.hayAvance()) {
      this.confirmarCancelar.set(true);
    } else {
      this.salir();
    }
  }

  protected salir(): void {
    this.confirmarCancelar.set(false);
    this.borrador.limpiar();
    void this.router.navigate(['/app/seguimiento']);
  }

  /**
   * Consulta el Estudio Digital del Libertador (paso 2) con el número de estudio
   * (consecutivo) y la cédula del inquilino. El backend consulta el estudio real,
   * enmascara la PII y devuelve el estado (APROBADO/NO_APROBADO/PENDIENTE) junto con
   * los datos del inquilino e inmueble que servirán para poblar el contrato (Req 5.3–5.6).
   */
  protected consultarEstudio(): void {
    if (!this.puedeConsultarEstudio()) {
      return;
    }
    this.consultandoEstudio.set(true);
    this.errorEstudio.set(null);
    this.resultadoEstudio.set(null);

    this.radicacionService
      .consultarEstudio(
        this.numeroEstudioArrendamiento().trim(),
        this.documentoInquilino().trim(),
        this.tipoDocumentoInquilino(),
      )
      .subscribe({
        next: (resultado) => {
          this.resultadoEstudio.set(resultado);
          this.consultandoEstudio.set(false);
        },
        error: () => {
          this.errorEstudio.set(
            'No fue posible consultar el estudio en este momento. Verifica el número y la cédula del inquilino e intenta nuevamente.',
          );
          this.consultandoEstudio.set(false);
        },
      });
  }

  /**
   * Consulta la API SARLAFT (paso 4). El backend decide la salida:
   * actualizado -> documentos; desactualizado -> URL al firmante y reconsulta;
   * consultable -> el caso queda en el Warehouse y el trámite termina.
   * También se usa para reconsultar tras la actualización.
   */
  protected consultarSarlaft(): void {
    if (!this.puedeConsultarSarlaft()) {
      return;
    }
    const clave = this.claveSarlaftActual();
    const documento = this.documentoSarlaft();
    this.consultandoSarlaft.set(true);
    this.errorSarlaft.set(null);
    this.sarlaftNoDisponible.set(false);
    this.enlaceCopiado.set(false);

    this.radicacionService
      .consultarSarlaft({
        sujeto: this.sujetoSarlaft(),
        tipoDocumento: documento.tipo,
        numeroDocumento: documento.numero.trim(),
        telefono: this.telefonoSarlaft().trim(),
        tipoPersona: this.tipoPersona(),
        numeroEstudioArrendamiento: this.numeroEstudioArrendamiento().trim(),
      })
      .subscribe({
        next: (resultado) => {
          this.consultaSarlaft.set({ clave, resultado });
          this.consultandoSarlaft.set(false);
          // Como el cotizador: si hay que actualizar, el formulario de SARLAFT se abre de una (si el navegador
          // bloquea la ventana, queda el botón "Abrir formulario de actualización").
          if (resultado.estado === 'DESACTUALIZADO' && resultado.enlaceActualizacion) {
            this.abrirEnlaceSarlaft();
          }
        },
        error: () => {
          this.errorSarlaft.set(
            'No fue posible consultar Conocimiento de Cliente en este momento. Intenta nuevamente o continúa '
              + 'cargando el SARLAFT físico diligenciado y firmado.',
          );
          this.sarlaftNoDisponible.set(true);
          this.consultandoSarlaft.set(false);
        },
      });
  }

  /** Abre el formulario de actualización de Conocimiento de Cliente en una pestaña nueva. */
  protected abrirEnlaceSarlaft(): void {
    abrirFormularioSarlaft(this.resultadoSarlaft()?.enlaceActualizacion);
  }

  /** Copia la URL de actualización SARLAFT para compartirla con el firmante. */
  protected copiarEnlaceSarlaft(): void {
    const enlace = this.resultadoSarlaft()?.enlaceActualizacion;
    if (!enlace) {
      return;
    }
    void navigator.clipboard
      ?.writeText(enlace)
      .then(() => this.enlaceCopiado.set(true))
      .catch(() => this.enlaceCopiado.set(false));
  }

  /** Descarta un resultado consultable para corregir los datos de la persona consultada. */
  protected corregirDatosSarlaft(): void {
    this.consultaSarlaft.set(null);
    this.errorSarlaft.set(null);
  }

  /** Valor del radio de firmante (propietario/apoderado) para el binding. */
  protected readonly firmante = computed(() =>
    this.firmaApoderado() ? 'apoderado' : 'propietario',
  );

  /** Actualiza el estado de apoderado al elegir el firmante del contrato (Req 10.2). */
  protected onCambioFirmante(valor: string): void {
    this.firmaApoderado.set(valor === 'apoderado');
  }

  /** Cambia el tipo de persona al seleccionar una pestaña (Req 10.3, 10.4). */
  protected onCambioTipoPersona(id: string): void {
    const tipo: TipoPersona = id === 'juridica' ? 'juridica' : 'natural';
    this.tipoPersona.set(tipo);
    // El SARLAFT condicional solo aplica a Persona_Natural (Req 12.1, 12.3).
    if (tipo === 'juridica') {
      this.sarlaftRequiereFormulario.set(false);
    }
  }

  /**
   * Procesa un archivo seleccionado para un documento: valida MIME/tamaño/vigencia
   * con la lógica pura reutilizada y actualiza el estado de cargados/validez.
   * El backend revalida siempre (Req 13.5).
   */
  protected onArchivo(evento: ArchivoSeleccionado): void {
    const tipo = evento.id as TipoDocumentoRadicacion;
    // La vigencia (CTL ≤ 90 días, existencia ≤ 30) la verifica el área sobre la fecha de expedición del documento.
    const regla = { ...reglaDesdeCatalogo(this.documentosCatalogo.find((d) => d.codigo === tipo)), vigenciaMaxDias: null };
    const hoyIso = new Date().toISOString();
    const resultado = validarDocumento(
      {
        nombre: evento.archivo.name,
        // El navegador expone el MIME real del archivo; si no es permitido, se rechaza.
        tipoMime: evento.archivo.type as never,
        tamanoBytes: evento.archivo.size,
        fechaEmision: undefined,
      },
      regla,
      hoyIso,
    );

    if (!resultado.valido) {
      this.feedback.toast({ variante: 'error', mensaje: `El archivo de "${this.etiquetaDocumento[tipo] ?? tipo}" no cumple los requisitos de carga.` });
      return;
    }

    this.archivos.set(tipo, evento.archivo);
    this.archivosCargados.update((actual) => ({
      ...actual,
      [tipo]: evento.archivo.name,
    }));
    this.tiposValidos.update((actual) => {
      const siguiente = new Set(actual);
      siguiente.add(tipo);
      return siguiente;
    });
  }

  /** Envía la radicación al backend cuando el envío está habilitado (Req 11.4). */
  protected enviar(): void {
    if (!this.envioHabilitado() || this.enviando()) {
      return;
    }
    this.enviando.set(true);

    const request = construirPayloadRadicacion({
      contratoReferencia: this.contratoReferencia(),
      numeroEstudioArrendamiento: this.numeroEstudioArrendamiento(),
      tipoDocumentoInquilino: this.tipoDocumentoInquilino(),
      documentoInquilino: this.documentoInquilino(),
      documentosCargados: [...this.cargadosValidos()],
      autorizacionDatos: this.autorizacionDatos(),
      tipoPersona: this.tipoPersona(),
      firmaApoderado: this.firmaApoderado(),
      tipoDocumentoApoderado: this.tipoDocumentoApoderado(),
      documentoApoderado: this.numeroDocumentoApoderado(),
      correoApoderado: this.firmaApoderado() ? this.correoApoderado().trim() : undefined,
      observaciones: this.observaciones(),
      vocabulario: this.documentosCatalogo.filter((d) => d['aplica'] !== 'OPCIONAL').map((d) => d.codigo),
    });

    // Radica, sube cada documento y envía al área (fila en el Warehouse en "Pendiente Validación Documental").
    let codigo = '';
    const pendiente = this.radicadoPendiente();
    const creacion$: Observable<{ readonly radicado: string }> = pendiente
      ? of({ radicado: pendiente })
      : this.radicacionService.radicar(request);
    creacion$
      .pipe(
        switchMap((respuesta) => {
          codigo = respuesta.radicado;
          // Si la carga o el envío fallan, el reintento sube los documentos a ESTA radicación (no crea otra).
          this.radicadoPendiente.set(codigo);
          const tipos = this.cargadosValidos().filter((t) => this.archivos.has(t));
          return concat(...tipos.map((t) => this.radicacionService.subirDocumento(codigo, t, this.archivos.get(t)!))).pipe(
            toArray(),
            switchMap(() => this.radicacionService.enviarAlArea(codigo)),
          );
        }),
      )
      .subscribe({
      next: () => {
        this.enviando.set(false);
        // Radicada y enviada al área: el borrador (cotización, contrato y formulario) ya no aplica.
        this.nuevaRadicacion();
        this.radicado.set(codigo);
        this.feedback.exito({
          titulo: '¡Radicación enviada!',
          mensaje: `Tu radicado es ${codigo}. El equipo revisará la documentación y verás el avance en Seguimiento.`,
          acciones: { confirmar: 'Entendido' },
        });
      },
      error: (err: unknown) => {
        // Se conserva el formulario; el mensaje orienta la corrección sin detalle técnico. Si ya quedó radicada,
        // se informa el código: los documentos se pueden reenviar desde Seguimiento.
        this.feedback.error({
          titulo: 'No se pudo continuar',
          mensaje:
            (codigo ? `La solicitud ${codigo} quedó radicada pero no se pudo enviar al área: ` : '') +
              mensajeErrorIntegracion(err),
        });
        this.enviando.set(false);
      },
    });
  }

  /**
   * Abre el Generador_Contrato de arrendamiento navegando a su ruta (Req 11.5, 30.1).
   *
   * <p>Si ya se consultó el Estudio Digital, lleva su resultado como estado de
   * navegación para que el contrato autollene los campos del inquilino, el inmueble
   * y el propietario desde los datos del estudio (todos enmascarados por el backend).</p>
   */
  private readonly contratoService = inject(ContratoService);
  /** Contrato firmado leído al que le faltan datos: se completa en Contratos con la lectura precargada. */
  protected readonly lecturaPorCompletar = signal<LecturaContratoResponse | null>(null);
  protected readonly registrandoContratoLeido = signal(false);

  /** El contrato firmado cargado se adjunta a la radicación como "Contrato de arrendamiento firmado". */
  protected onContratoFirmado(archivo: File): void {
    this.onArchivo({ id: DOCUMENTO_OPCIONAL, archivo });
  }

  /**
   * Con la lectura del contrato firmado: precarga los documentos de la radicación y, si trae todo lo que el
   * contrato exige, lo registra de una (queda listo para radicar). Si falta algo, se completa en Contratos.
   */
  /** Cómo se firmó el contrato que se carga (el Consolidado lo pide: firma electrónica o por notaría). */
  protected readonly tiposFirma = this.catalogo.opciones('tipo_firma');
  protected readonly firmaContratoCargado = signal('');

  /** El inmueble del estudio está en una ciudad sin cobertura: se advierte y el área decide. */
  protected readonly estudioSinCobertura = computed(() =>
    inmuebleSinCobertura(this.resultadoEstudio()?.inmueble, this.catalogo.opciones('ciudad').map((c) => c.descripcion)),
  );

  protected onContratoLeido(lectura: LecturaContratoResponse): void {
    if (!this.numeroDocumentoPropietario().trim() && lectura.arrendador.numeroIdentificacion) {
      this.numeroDocumentoPropietario.set(lectura.arrendador.numeroIdentificacion);
    }
    if (!this.documentoInquilino().trim() && lectura.arrendatario.numeroIdentificacion) {
      this.documentoInquilino.set(lectura.arrendatario.numeroIdentificacion);
    }
    const usos = this.catalogo.opciones('uso_inmueble');
    const request = contratoDesdeLectura(lectura, {
      ciudades: this.catalogo.opciones('ciudad').map((c) => c.descripcion),
      usoVivienda: usos.find((u) => u['plantilla'] !== 'COMERCIO')?.descripcion ?? 'Vivienda',
      usoComercio: usos.find((u) => u['plantilla'] === 'COMERCIO')?.descripcion ?? 'Comercial',
    }, this.firmaContratoCargado());
    if (!request) {
      this.lecturaPorCompletar.set(lectura);
      this.avisarContratoLeido({
        variante: 'warning',
        texto: 'Al contrato le faltan datos para registrarlo (partes, ciudad con cobertura, canon, fecha o cuenta). '
          + 'Complétalos en Contratos: ya van precargados.',
      });
      return;
    }
    this.lecturaPorCompletar.set(null);
    this.registrandoContratoLeido.set(true);
    this.contratoService.generar(request).subscribe({
      next: (respuesta) => {
        this.registrandoContratoLeido.set(false);
        this.borrador.contrato.set({ referencia: respuesta.radicado, leasing: false });
        this.avisarContratoLeido({
          variante: lectura.firmado ? 'success' : 'warning',
          texto: lectura.firmado
            ? 'Contrato firmado leído y registrado con sus datos. Ya puedes radicar.'
            : 'Contrato registrado con sus datos, pero no vimos las firmas: el área lo revisará.',
        });
      },
      error: (err: unknown) => {
        this.registrandoContratoLeido.set(false);
        this.lecturaPorCompletar.set(lectura);
        this.avisarContratoLeido({ variante: 'error', texto: `${mensajeErrorIntegracion(err)} Puedes completarlo en Contratos.` });
      },
    });
  }

  /** Abre Contratos con la lectura del contrato firmado precargada para completar lo que falta. */
  protected completarContratoLeido(): void {
    void this.router.navigate(['/app/contrato'], { state: { lectura: this.lecturaPorCompletar() } });
  }

  protected crearContrato(): void {
    const estudio = this.resultadoEstudio();
    void this.router.navigate(['/app/contrato'], {
      state: estudio
        ? {
            estudio,
            // Con el estudio ya consultado, el contrato trae del estudio digital a las partes y el inmueble.
            consulta: {
              numeroEstudio: this.numeroEstudioArrendamiento().trim(),
              tipoDocumentoInquilino: this.tipoDocumentoInquilino(),
              documentoInquilino: this.documentoInquilino().trim(),
            },
            propietario: {
              tipoDocumento: this.tipoDocumentoPropietario(),
              numeroDocumento: this.numeroDocumentoPropietario().trim(),
            },
          }
        : undefined,
    });
  }

  /** Construye la regla de presentación del uploader para un documento (Req 35.7). */
  private reglaUploader(
    tipo: TipoDocumentoRadicacion,
    obligatorio: boolean,
  ): ReglaDocumentoUploader {
    return {
      id: tipo,
      etiqueta: this.etiquetaDocumento[tipo] ?? tipo,
      descripcion: String(this.documentosCatalogo.find((d) => d.codigo === tipo)?.['ayuda'] ?? ''),
      obligatorio,
    };
  }

  /** Resultado de registrar el contrato firmado leído. */
  private avisarContratoLeido(m: { variante: 'success' | 'warning' | 'error'; texto: string }): void {
    const variante = m.variante === 'success' ? 'exito' : m.variante === 'warning' ? 'info' : 'error';
    this.feedback.toast({ variante, titulo: 'Contrato firmado', mensaje: m.texto });
  }
}
