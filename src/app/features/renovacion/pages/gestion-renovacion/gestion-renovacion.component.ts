import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import {
  AlertBannerComponent,
  ArchivoSeleccionado,
  DocUploaderComponent,
  EscaleritaLoaderComponent,
  ReglaDocumentoUploader,
  StepperComponent,
  SuccessScreenComponent,
  TarjetaSeguimiento,
} from '../../../../shared/components';

/** Paso activo del wizard de renovación (0-indexado). */
const enum PasoRenovacion {
  Opciones = 0,
  Detalles = 1,
  Ajuste = 2,
  Proceso = 3,
}

/**
 * Flujo activo del wizard. `renovacion` es el flujo por defecto de 4 pasos;
 * `caso-especial` y `correccion` son los dos flujos migrados desde el proyecto
 * de referencia, cada uno con su propio stepper de 3 pasos.
 */
type Flujo = 'renovacion' | 'caso-especial' | 'correccion';

/**
 * Sub-paso interno de los flujos Caso Especial y Corrección. Se controla de
 * forma independiente al `pasoActivo` del flujo de renovación para no interferir
 * con el stepper de 4 pasos.
 */
type SubPaso = 'documentacion' | 'observaciones' | 'sarlaft' | 'exito';

/** Estado de la validación SARLAFT simulada dentro del sub-paso de confirmación. */
type EstadoSarlaft = 'validando' | 'exito';

/** Modalidad de ajuste seleccionada en el paso de detalles. */
type ModalidadDetalle = 'anterior' | 'ajustar' | null;

/** Modo con el que se abre el paso de ajuste: bloqueado (solo lectura) o editable. */
type ModoAjuste = 'bloqueado' | 'editable';

/** Número de póliza usado como respaldo de demostración cuando no llega por queryParam. */
const POLIZA_FALLBACK = 'POL-2023-8901';

/** Duración (ms) de la validación SARLAFT simulada antes de mostrar el éxito. */
const DURACION_SARLAFT_MS = 2000;

/** Ruta de retorno al listado de renovaciones. */
const RUTA_RENOVACIONES = '/app/renovaciones';

/** Datos mock de la póliza mostrados en el paso de detalles (replican el proyecto fuente). */
interface DatosPoliza {
  readonly numero: string;
  readonly tipoCobertura: string;
  readonly fechaVencimiento: Date;
  readonly valorMensual: number;
  readonly administracion: number;
  readonly serviciosPublicos: number;
  readonly danosFaltantes: number;
}

/**
 * GestionRenovacionComponent — Wizard de renovación de póliza de arrendamiento.
 *
 * Componente standalone auto-contenido que maneja internamente con signals tres
 * flujos, todos dentro del mismo wizard (sin sub-rutas), ramificados por la
 * signal `flujo`:
 *  - `renovacion` (por defecto): 4 pasos Opciones → Detalles → Ajuste →
 *    Proceso/Confirmación, controlados por la signal `pasoActivo`.
 *  - `caso-especial`: 3 pasos (documentación → SARLAFT → éxito), controlados por
 *    la signal `subPaso`.
 *  - `correccion`: 3 pasos (subir documento → observaciones → SARLAFT/éxito),
 *    controlados por la signal `subPaso`.
 *
 * Recibe el número de póliza por el queryParam `numeroPolizaInicial` (usado en el
 * título del paso 1) y navega a `/app/renovaciones` al cancelar o finalizar.
 */
@Component({
  selector: 'app-gestion-renovacion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    CurrencyPipe,
    DatePipe,
    StepperComponent,
    AlertBannerComponent,
    DocUploaderComponent,
    EscaleritaLoaderComponent,
    SuccessScreenComponent,
  ],
  templateUrl: './gestion-renovacion.component.html',
  styleUrl: './gestion-renovacion.component.scss',
})
export class GestionRenovacionComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  /** Etiquetas de los pasos para el `StepperComponent` compartido. */
  protected readonly pasos: readonly string[] = [
    'Opciones',
    'Detalles',
    'Ajuste',
    'Confirmación',
  ];

  /** Paso activo del wizard (0..3). */
  protected readonly pasoActivo = signal<PasoRenovacion>(PasoRenovacion.Opciones);

  /** Modo del paso de ajuste: bloqueado (solo lectura) o editable. */
  protected readonly modoAjuste = signal<ModoAjuste>('bloqueado');

  /** Modalidad seleccionada en el paso de detalles (habilita "Continuar al Paso 3"). */
  protected readonly modalidadSeleccionada = signal<ModalidadDetalle>(null);

  /** Controla la visibilidad del diálogo de confirmación de "No renovar". */
  protected readonly mostrarConfirmacionNoRenovar = signal(false);

  /** Número de póliza recibido por queryParam; con respaldo de demostración. */
  protected readonly numeroPoliza = signal(POLIZA_FALLBACK);

  // --- Flujos Caso Especial / Corrección ---------------------------------

  /** Flujo activo del wizard (renovación por defecto). */
  protected readonly flujo = signal<Flujo>('renovacion');

  /** Sub-paso interno de los flujos Caso Especial y Corrección. */
  protected readonly subPaso = signal<SubPaso>('documentacion');

  /** Estado de la validación SARLAFT simulada (loader → éxito). */
  protected readonly estadoSarlaft = signal<EstadoSarlaft>('validando');

  /** Nombre del archivo cargado (usado para mostrarlo y habilitar botones). */
  protected readonly archivoNombre = signal<string | null>(null);

  /** Observaciones del caso especial. */
  protected readonly observacionesCaso = signal('');

  /** Observaciones de la corrección de documentos (máx. 500 caracteres). */
  protected readonly observacionesCorreccion = signal('');

  /** Máximo de caracteres permitidos en las observaciones de corrección. */
  protected readonly maxCaracteresCorreccion = 500;

  /** Etiquetas del stepper del flujo Caso Especial (3 pasos). */
  protected readonly pasosCasoEspecial: readonly string[] = [
    'Selección de póliza',
    'Documentación del caso especial',
    'Confirmación de identidad',
  ];

  /** Etiquetas del stepper del flujo Corrección de Documentos (3 pasos). */
  protected readonly pasosCorreccion: readonly string[] = [
    'Subir documento de póliza',
    'Observaciones de corrección',
    'Confirmación de identidad',
  ];

  /** Regla única del cargador de documentos del caso especial. */
  protected readonly reglaCasoEspecial: readonly ReglaDocumentoUploader[] = [
    {
      id: 'documento-caso-especial',
      etiqueta: 'Documento legal del caso especial',
      descripcion: 'Otro Sí o Cesión de Contrato firmado (PDF, JPG, PNG · máx. 10MB)',
      icono: '📄',
      obligatorio: true,
    },
  ];

  /** Regla única del cargador de documentos de corrección. */
  protected readonly reglaCorreccion: readonly ReglaDocumentoUploader[] = [
    {
      id: 'documento-correccion',
      etiqueta: 'Documento corregido',
      descripcion: 'Nueva imagen o PDF legible (JPG, PNG, PDF · máx. 5MB)',
      icono: '🪪',
      obligatorio: true,
    },
  ];

  /** Tarjetas de seguimiento mostradas en la pantalla de éxito del caso especial. */
  protected readonly tarjetasCasoEspecial: readonly TarjetaSeguimiento[] = [
    { etiqueta: 'RADICADO', valor: '#TR-2024-8902' },
    { etiqueta: 'ESTADO', valor: '🟡 En Revisión' },
    { etiqueta: 'FECHA ESTIMADA', valor: this.formatearFechaEstimada() },
  ];

  /** Identificador del temporizador de la validación SARLAFT simulada. */
  private sarlaftTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /** Datos mock de la póliza (idénticos al proyecto fuente). */
  protected readonly poliza = computed<DatosPoliza>(() => ({
    numero: this.numeroPoliza(),
    tipoCobertura: 'Arrendamiento Integral',
    fechaVencimiento: new Date('2024-12-31'),
    valorMensual: 450000,
    administracion: 150000,
    serviciosPublicos: 80000,
    danosFaltantes: 120000,
  }));

  /** Total estimado de la póliza mostrado en la barra lateral del paso de detalles. */
  protected readonly totalEstimado = computed(() => {
    const p = this.poliza();
    return (
      p.valorMensual + p.administracion + p.serviciosPublicos + p.danosFaltantes
    );
  });

  /** Verdadero cuando el paso de ajuste se abre en modo solo lectura. */
  protected readonly esBloqueado = computed(() => this.modoAjuste() === 'bloqueado');

  /** Formulario reactivo del paso de ajuste (valores por defecto del proyecto fuente). */
  protected readonly formulario: FormGroup = this.fb.group({
    valorCanon: [450000, [Validators.required, Validators.min(1)]],
    administracion: [150000, [Validators.required, Validators.min(0)]],
    valorAseguradoServicios: [80000, [Validators.required, Validators.min(0)]],
    valorAseguradoDyF: [120000, [Validators.required, Validators.min(0)]],
    periodoActual: ['2024-01-01'],
    periodoProyectado: ['01/01/2025 - 31/12/2025'],
    ipcAplicado: [5.2],
    observaciones: ['', [Validators.maxLength(500)]],
  });

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const numero = params.get('numeroPolizaInicial');
      this.numeroPoliza.set(numero && numero.trim().length > 0 ? numero.trim() : POLIZA_FALLBACK);
    });
  }

  // --- Paso 1: Opciones ---------------------------------------------------

  /** Inicia la renovación física avanzando al paso de detalles. */
  protected navegarRenovacionFisica(): void {
    this.irADetalles();
  }

  /** Inicia la renovación digital avanzando al paso de detalles. */
  protected navegarRenovacionDigital(): void {
    this.irADetalles();
  }

  /** Muestra el diálogo de confirmación antes de la acción destructiva "No renovar". */
  protected solicitarNoRenovar(): void {
    this.mostrarConfirmacionNoRenovar.set(true);
  }

  /** Confirma la no renovación y regresa al listado de renovaciones. */
  protected confirmarNoRenovar(): void {
    this.mostrarConfirmacionNoRenovar.set(false);
    void this.router.navigate([RUTA_RENOVACIONES]);
  }

  /** Cancela la acción de no renovar y cierra el diálogo. */
  protected cancelarNoRenovar(): void {
    this.mostrarConfirmacionNoRenovar.set(false);
  }

  /** Avanza al paso de detalles reiniciando la modalidad seleccionada. */
  private irADetalles(): void {
    this.modalidadSeleccionada.set(null);
    this.pasoActivo.set(PasoRenovacion.Detalles);
  }

  // --- Paso 1: entrada a flujos Caso Especial / Corrección ----------------

  /**
   * Inicia el flujo Caso Especial (Otro Sí / Cesión / gestión general) en su
   * paso de documentación, reiniciando el estado del cargador y observaciones.
   */
  protected iniciarCasoEspecial(): void {
    this.reiniciarEstadoFlujo();
    this.flujo.set('caso-especial');
    this.subPaso.set('documentacion');
  }

  /** Inicia el flujo Corrección de Documentos en su paso 1 (subir documento). */
  protected iniciarCorreccion(): void {
    this.reiniciarEstadoFlujo();
    this.flujo.set('correccion');
    this.subPaso.set('documentacion');
  }

  /** Reinicia archivo, observaciones y estado SARLAFT al entrar a un flujo. */
  private reiniciarEstadoFlujo(): void {
    this.cancelarTemporizadorSarlaft();
    this.archivoNombre.set(null);
    this.observacionesCaso.set('');
    this.observacionesCorreccion.set('');
    this.estadoSarlaft.set('validando');
  }

  /** Regresa al Paso 1 (Opciones) del wizard reiniciando el flujo activo. */
  protected volverAOpciones(): void {
    this.reiniciarEstadoFlujo();
    this.flujo.set('renovacion');
    this.pasoActivo.set(PasoRenovacion.Opciones);
  }

  // --- Paso 2: Detalles ---------------------------------------------------

  /** Selecciona la modalidad "condiciones actuales" (ajuste en modo bloqueado). */
  protected seleccionarAnterior(): void {
    this.modalidadSeleccionada.set('anterior');
  }

  /** Selecciona la modalidad "ajustar póliza" (ajuste en modo editable). */
  protected seleccionarAjustar(): void {
    this.modalidadSeleccionada.set('ajustar');
  }

  /** Cancela el flujo y regresa al listado de renovaciones. */
  protected cancelar(): void {
    void this.router.navigate([RUTA_RENOVACIONES]);
  }

  /** Continúa al paso de ajuste aplicando el modo según la modalidad elegida. */
  protected continuarAlAjuste(): void {
    const modalidad = this.modalidadSeleccionada();
    if (!modalidad) {
      return;
    }
    const modo: ModoAjuste = modalidad === 'anterior' ? 'bloqueado' : 'editable';
    this.modoAjuste.set(modo);
    if (modo === 'bloqueado') {
      this.formulario.disable();
    } else {
      this.formulario.enable();
    }
    this.pasoActivo.set(PasoRenovacion.Ajuste);
  }

  // --- Paso 3: Ajuste -----------------------------------------------------

  /** Incrementa el IPC aplicado en 0.1 puntos. */
  protected incrementarIpc(): void {
    const actual = Number(this.formulario.get('ipcAplicado')?.value ?? 0);
    this.formulario.patchValue({ ipcAplicado: +(actual + 0.1).toFixed(1) });
  }

  /** Decrementa el IPC aplicado en 0.1 puntos, sin bajar de 0. */
  protected decrementarIpc(): void {
    const actual = Number(this.formulario.get('ipcAplicado')?.value ?? 0);
    if (actual > 0) {
      this.formulario.patchValue({ ipcAplicado: +(actual - 0.1).toFixed(1) });
    }
  }

  /** Calcula la prima base como canon + administración. */
  protected calcularPrimaBase(): number {
    const canon = Number(this.formulario.get('valorCanon')?.value ?? 0);
    const admin = Number(this.formulario.get('administracion')?.value ?? 0);
    return canon + admin;
  }

  /** Calcula el total como prima base + servicios + daños y faltantes. */
  protected calcularTotal(): number {
    const servicios = Number(this.formulario.get('valorAseguradoServicios')?.value ?? 0);
    const dyf = Number(this.formulario.get('valorAseguradoDyF')?.value ?? 0);
    return this.calcularPrimaBase() + servicios + dyf;
  }

  /** Guarda el borrador y regresa al listado de renovaciones. */
  protected guardarBorrador(event: Event): void {
    event.preventDefault();
    void this.router.navigate(['/app/renovaciones']);
  }

  /** Avanza al paso de proceso/confirmación. */
  protected continuarSiguientePaso(): void {
    this.pasoActivo.set(PasoRenovacion.Proceso);
  }

  /** Regresa del paso de ajuste al paso de detalles. */
  protected volverADetalles(): void {
    this.pasoActivo.set(PasoRenovacion.Detalles);
  }

  // --- Paso 4: Proceso ----------------------------------------------------

  /** Finaliza el flujo y regresa al tab de renovaciones. */
  protected finalizar(): void {
    void this.router.navigate([RUTA_RENOVACIONES]);
  }

  // --- Flujos Caso Especial / Corrección: manejo de archivo ---------------

  /** Registra el nombre del archivo seleccionado en el cargador compartido. */
  protected onArchivoSeleccionado(evento: ArchivoSeleccionado): void {
    this.archivoNombre.set(evento.archivo.name);
  }

  /** Verdadero cuando ya se cargó un archivo (habilita botones de avance). */
  protected get hayArchivo(): boolean {
    return this.archivoNombre() !== null;
  }

  /** Mapa de archivos cargados para el cargador del caso especial. */
  protected get cargadosCasoEspecial(): Readonly<Record<string, string>> {
    const nombre = this.archivoNombre();
    return nombre ? { 'documento-caso-especial': nombre } : {};
  }

  /** Mapa de archivos cargados para el cargador de corrección. */
  protected get cargadosCorreccion(): Readonly<Record<string, string>> {
    const nombre = this.archivoNombre();
    return nombre ? { 'documento-correccion': nombre } : {};
  }

  // --- Flujo Caso Especial ------------------------------------------------

  /** Confirma la documentación y arranca la validación SARLAFT simulada. */
  protected confirmarCasoEspecial(): void {
    if (!this.hayArchivo) {
      return;
    }
    this.iniciarValidacionSarlaft();
  }

  /** Al finalizar SARLAFT con éxito, muestra la pantalla final del caso especial. */
  protected continuarExitoCasoEspecial(): void {
    this.subPaso.set('exito');
  }

  // --- Flujo Corrección de Documentos -------------------------------------

  /** Avanza del paso 1 (subir documento) al paso 2 (observaciones). */
  protected continuarCorreccionPaso2(): void {
    if (!this.hayArchivo) {
      return;
    }
    this.subPaso.set('observaciones');
  }

  /** Regresa del paso 2 de corrección al paso 1 (subir documento). */
  protected volverCorreccionPaso1(): void {
    this.subPaso.set('documentacion');
  }

  /** Envía la corrección y arranca la validación SARLAFT simulada. */
  protected enviarCorreccion(): void {
    this.iniciarValidacionSarlaft();
  }

  /** Al finalizar SARLAFT con éxito, muestra la pantalla final de corrección. */
  protected continuarExitoCorreccion(): void {
    this.subPaso.set('exito');
  }

  /** Caracteres usados en las observaciones de corrección (para el contador). */
  protected get caracteresCorreccion(): number {
    return this.observacionesCorreccion().length;
  }

  // --- Validación SARLAFT simulada (compartida por ambos flujos) ----------

  /**
   * Inicia la simulación de validación SARLAFT: muestra el loader durante
   * `DURACION_SARLAFT_MS` y luego marca el estado como éxito. El cambio de
   * signal dispara la detección de cambios bajo OnPush.
   */
  private iniciarValidacionSarlaft(): void {
    this.cancelarTemporizadorSarlaft();
    this.estadoSarlaft.set('validando');
    this.subPaso.set('sarlaft');
    this.sarlaftTimeoutId = setTimeout(() => {
      this.estadoSarlaft.set('exito');
      this.sarlaftTimeoutId = null;
    }, DURACION_SARLAFT_MS);
  }

  /** Cancela el temporizador SARLAFT pendiente, si existe. */
  private cancelarTemporizadorSarlaft(): void {
    if (this.sarlaftTimeoutId !== null) {
      clearTimeout(this.sarlaftTimeoutId);
      this.sarlaftTimeoutId = null;
    }
  }

  /** Fecha estimada (hoy + 2 días) formateada en español para la pantalla de éxito. */
  private formatearFechaEstimada(): string {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 2);
    return fecha.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
}
