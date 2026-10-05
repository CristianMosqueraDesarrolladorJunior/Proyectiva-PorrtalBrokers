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
import type { Observable } from 'rxjs';

import type { DocumentoCargado } from '../../../../core/models/documento.model';
import type {
  MotivoNoRenovacion,
  ResultadoSarlaftRenovacion,
  TipoCasoEspecial,
} from '../../../../core/models/renovacion.model';
import { CorreccionService } from '../../../../core/services/correccion.service';
import { RenovacionService } from '../../../../core/services/renovacion.service';
import {
  AlertBannerComponent,
  ArchivoSeleccionado,
  DocUploaderComponent,
  RadioGroupComponent,
  ReglaDocumentoUploader,
  StepTabsComponent,
  SuccessScreenComponent,
  TarjetaSeguimiento,
} from '../../../../shared/components';
import type { OpcionRadio } from '../../../../shared/components/radio-group/radio-group.component';
import { SarlaftRenovacionComponent } from '../../components/sarlaft-renovacion/sarlaft-renovacion.component';
import {
  ETIQUETA_TIPO_CASO_ESPECIAL,
  TIPOS_CASO_ESPECIAL,
} from '../../caso-especial-habilitacion';
import {
  ETAPAS_POR_FLUJO,
  PASOS_POR_FLUJO,
  etapaAnterior,
  indicePaso,
  siguienteEtapa,
  type EtapaGestion,
  type FlujoGestion,
} from '../../gestion-renovacion-flujo';
import {
  ETIQUETA_MOTIVO_NO_RENOVACION,
  MOTIVOS_NO_RENOVACION,
  puedeEnviarNoRenovacion,
} from '../../no-renovacion-habilitacion';

/** Modalidad de renovación digital elegida en Detalles. */
type ModalidadDetalle = 'anterior' | 'ajustar' | null;

/** Modo del paso Ajuste: bloqueado (mismos valores) o editable (con ajustes). */
type ModoAjuste = 'bloqueado' | 'editable';

/** Número de póliza de respaldo cuando no llega por queryParam. */
const POLIZA_FALLBACK = 'POL-2023-8901';

/** Ruta de retorno al portafolio de renovaciones. */
const RUTA_RENOVACIONES = '/app/renovaciones';

/** Datos mock de la póliza mostrados en Detalles (replican el proyecto fuente). */
interface DatosPoliza {
  readonly numero: string;
  readonly tipoCobertura: string;
  readonly fechaVencimiento: Date;
  readonly valorMensual: number;
  readonly administracion: number;
  readonly serviciosPublicos: number;
  readonly danosFaltantes: number;
}

/** Respuesta común de los registros (renovación, caso especial, no renovación, corrección). */
interface Confirmacion {
  readonly radicado: string;
  readonly estado: string;
}

/**
 * GestionRenovacionComponent — wizard de gestión de una póliza por renovar.
 *
 * Sigue el proceso real de renovaciones (proyecto AutogestionRenovaciones): en
 * Opciones el broker elige una de 4 gestiones y TODAS validan SARLAFT antes de
 * enviarse:
 * - Renovación física: formulario diligenciado → SARLAFT → enviada.
 * - Renovación digital: detalles (modalidad) → ajuste → SARLAFT → en proceso.
 * - Caso especial: Otro Sí / Cesión (documento) o No renovar (motivo) → SARLAFT.
 * - Corrección de documentos: documento → observaciones → SARLAFT → enviada.
 *
 * El estado es `flujo` + `etapa` (lógica pura en `gestion-renovacion-flujo.ts`).
 * Con SARLAFT vigente se registra la gestión en el API_Backend; el backend revalida.
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
    StepTabsComponent,
    AlertBannerComponent,
    DocUploaderComponent,
    RadioGroupComponent,
    SuccessScreenComponent,
    SarlaftRenovacionComponent,
  ],
  templateUrl: './gestion-renovacion.component.html',
  styleUrl: './gestion-renovacion.component.scss',
})
export class GestionRenovacionComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly renovacionService = inject(RenovacionService);
  private readonly correccionService = inject(CorreccionService);

  // --- Estado del wizard ---------------------------------------------------

  /** Gestión elegida (solo aplica fuera de Opciones). */
  protected readonly flujo = signal<FlujoGestion>('digital');

  /** Etapa actual del wizard. */
  protected readonly etapa = signal<EtapaGestion>('opciones');

  /** Etiquetas del stepper del flujo activo. */
  protected readonly pasosFlujo = computed(() => PASOS_POR_FLUJO[this.flujo()]);

  /** Paso activo del stepper. */
  protected readonly pasoActivo = computed(() => indicePaso(this.flujo(), this.etapa()));

  /** Número de póliza recibido por queryParam. */
  protected readonly numeroPoliza = signal(POLIZA_FALLBACK);

  /** Diálogo de confirmación antes de "No renovar". */
  protected readonly mostrarConfirmacionNoRenovar = signal(false);

  // --- Captura común (archivo + texto) ------------------------------------

  /** Archivo cargado en la etapa de captura (formulario, documento legal o corrección). */
  protected readonly archivo = signal<File | null>(null);

  /** Comentarios / observaciones de la gestión activa. */
  protected readonly comentarios = signal('');

  /** Máximo de caracteres de observaciones. */
  protected readonly maxCaracteres = 500;

  // --- Caso especial y no renovar -----------------------------------------

  protected readonly tipoCasoEspecial = signal<TipoCasoEspecial>('otroSi');
  protected readonly opcionesCasoEspecial: readonly OpcionRadio[] = TIPOS_CASO_ESPECIAL.map(
    (tipo) => ({ valor: tipo, etiqueta: ETIQUETA_TIPO_CASO_ESPECIAL[tipo] }),
  );

  protected readonly motivoNoRenovacion = signal<string>('');
  protected readonly opcionesMotivo: readonly OpcionRadio[] = MOTIVOS_NO_RENOVACION.map(
    (motivo) => ({ valor: motivo, etiqueta: ETIQUETA_MOTIVO_NO_RENOVACION[motivo] }),
  );
  protected readonly motivoValido = computed(() =>
    puedeEnviarNoRenovacion(this.motivoNoRenovacion()),
  );

  // --- Renovación digital --------------------------------------------------

  protected readonly modoAjuste = signal<ModoAjuste>('bloqueado');
  protected readonly modalidadSeleccionada = signal<ModalidadDetalle>(null);
  protected readonly esBloqueado = computed(() => this.modoAjuste() === 'bloqueado');

  /** Formulario del paso Ajuste (valores por defecto del proyecto fuente). */
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

  protected readonly totalEstimado = computed(() => {
    const p = this.poliza();
    return p.valorMensual + p.administracion + p.serviciosPublicos + p.danosFaltantes;
  });

  // --- Envío tras SARLAFT vigente -----------------------------------------

  protected readonly enviando = signal(false);
  protected readonly errorEnvio = signal<string | null>(null);
  protected readonly confirmacion = signal<Confirmacion | null>(null);

  /** Tarjetas de seguimiento de las pantallas de éxito. */
  protected readonly tarjetasExito = computed<readonly TarjetaSeguimiento[]>(() => {
    const c = this.confirmacion();
    return [
      { etiqueta: 'RADICADO', valor: c?.radicado ?? '—' },
      { etiqueta: 'ESTADO', valor: c?.estado ?? '—' },
      { etiqueta: 'PÓLIZA', valor: `#${this.numeroPoliza()}` },
    ];
  });

  // --- Reglas de los cargadores -------------------------------------------

  protected readonly reglaFormularioRenovacion: readonly ReglaDocumentoUploader[] = [
    {
      id: 'formulario-renovacion',
      etiqueta: 'Formulario de renovación diligenciado',
      descripcion: 'Formato físico firmado (PDF, JPG, PNG · máx. 10MB)',
      icono: '📝',
      obligatorio: true,
    },
  ];

  protected readonly reglaCasoEspecial: readonly ReglaDocumentoUploader[] = [
    {
      id: 'documento-caso-especial',
      etiqueta: 'Documento legal del caso especial',
      descripcion: 'Otro Sí o Cesión de Contrato firmado (PDF, JPG, PNG · máx. 10MB)',
      icono: '📄',
      obligatorio: true,
    },
  ];

  protected readonly reglaCorreccion: readonly ReglaDocumentoUploader[] = [
    {
      id: 'documento-correccion',
      etiqueta: 'Documento corregido',
      descripcion: 'Nueva imagen o PDF legible (JPG, PNG, PDF · máx. 5MB)',
      icono: '🪪',
      obligatorio: true,
    },
  ];

  /** Mapa id → nombre para el cargador de la etapa de captura. */
  protected readonly cargados = computed<Readonly<Record<string, string>>>(() => {
    const archivo = this.archivo();
    if (!archivo) {
      return {};
    }
    const id =
      this.flujo() === 'fisica'
        ? 'formulario-renovacion'
        : this.flujo() === 'caso-especial'
          ? 'documento-caso-especial'
          : 'documento-correccion';
    return { [id]: archivo.name };
  });

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const numero = params.get('numeroPolizaInicial');
      this.numeroPoliza.set(
        numero && numero.trim().length > 0 ? numero.trim().replace(/^#/, '') : POLIZA_FALLBACK,
      );
    });
  }

  // --- Opciones --------------------------------------------------------------

  protected iniciarRenovacionFisica(): void {
    this.iniciar('fisica', 'captura');
  }

  protected iniciarRenovacionDigital(): void {
    this.modalidadSeleccionada.set(null);
    this.iniciar('digital', 'detalles');
  }

  protected iniciarCasoEspecial(tipo: TipoCasoEspecial = 'otroSi'): void {
    this.tipoCasoEspecial.set(tipo);
    this.iniciar('caso-especial', 'captura');
  }

  protected iniciarCorreccion(): void {
    this.iniciar('correccion', 'captura');
  }

  /** "No renovar" es un caso especial: primero se confirma la decisión. */
  protected solicitarNoRenovar(): void {
    this.mostrarConfirmacionNoRenovar.set(true);
  }

  protected confirmarNoRenovar(): void {
    this.mostrarConfirmacionNoRenovar.set(false);
    this.motivoNoRenovacion.set('');
    this.iniciar('no-renovar', 'captura');
  }

  protected cancelarNoRenovar(): void {
    this.mostrarConfirmacionNoRenovar.set(false);
  }

  /** Regresa a Opciones descartando lo capturado. */
  protected volverAOpciones(): void {
    this.reiniciarCaptura();
    this.etapa.set('opciones');
  }

  /** Abandona la gestión y vuelve al portafolio. */
  protected cancelar(): void {
    void this.router.navigate([RUTA_RENOVACIONES]);
  }

  /** Abre Documentos para descargar el formato de renovación. */
  protected irAFormatos(): void {
    void this.router.navigate(['/app/documentos']);
  }

  // --- Navegación genérica ---------------------------------------------------

  /** Avanza a la siguiente etapa del flujo (la de SARLAFT inclusive). */
  protected avanzar(): void {
    this.etapa.set(siguienteEtapa(this.flujo(), this.etapa()));
  }

  protected retroceder(): void {
    this.etapa.set(etapaAnterior(this.flujo(), this.etapa()));
  }

  /**
   * Vuelve a un paso completado desde las pestañas. Volver a Opciones descarta la
   * captura; después de enviar (éxito) ya no se puede volver.
   */
  protected irAPaso(indice: number): void {
    if (this.etapa() === 'exito' || indice >= this.pasoActivo()) {
      return;
    }
    const destino = ETAPAS_POR_FLUJO[this.flujo()][indice];
    if (destino === 'opciones') {
      this.volverAOpciones();
    } else if (destino) {
      this.etapa.set(destino);
    }
  }

  // --- Captura ---------------------------------------------------------------

  protected onArchivoSeleccionado(evento: ArchivoSeleccionado): void {
    this.archivo.set(evento.archivo);
  }

  protected get hayArchivo(): boolean {
    return this.archivo() !== null;
  }

  protected get caracteresComentarios(): number {
    return this.comentarios().length;
  }

  // --- Renovación digital: Detalles y Ajuste -------------------------------

  protected seleccionarAnterior(): void {
    this.modalidadSeleccionada.set('anterior');
  }

  protected seleccionarAjustar(): void {
    this.modalidadSeleccionada.set('ajustar');
  }

  /** Pasa a Ajuste en modo bloqueado (mismos valores) o editable (con ajustes). */
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
    this.etapa.set('ajuste');
  }

  protected incrementarIpc(): void {
    const actual = Number(this.formulario.get('ipcAplicado')?.value ?? 0);
    this.formulario.patchValue({ ipcAplicado: +(actual + 0.1).toFixed(1) });
  }

  protected decrementarIpc(): void {
    const actual = Number(this.formulario.get('ipcAplicado')?.value ?? 0);
    if (actual > 0) {
      this.formulario.patchValue({ ipcAplicado: +(actual - 0.1).toFixed(1) });
    }
  }

  protected calcularPrimaBase(): number {
    const canon = Number(this.formulario.get('valorCanon')?.value ?? 0);
    const admin = Number(this.formulario.get('administracion')?.value ?? 0);
    return canon + admin;
  }

  protected calcularTotal(): number {
    const servicios = Number(this.formulario.get('valorAseguradoServicios')?.value ?? 0);
    const dyf = Number(this.formulario.get('valorAseguradoDyF')?.value ?? 0);
    return this.calcularPrimaBase() + servicios + dyf;
  }

  protected guardarBorrador(event: Event): void {
    event.preventDefault();
    void this.router.navigate([RUTA_RENOVACIONES]);
  }

  // --- SARLAFT vigente → registrar la gestión -------------------------------

  /** Con SARLAFT vigente registra la gestión en el backend y muestra el éxito. */
  protected onSarlaftVigente(resultado: ResultadoSarlaftRenovacion): void {
    if (this.enviando()) {
      return;
    }
    this.enviando.set(true);
    this.errorEnvio.set(null);
    this.registrar(resultado.validacionId).subscribe({
      next: (respuesta) => {
        this.confirmacion.set({ radicado: respuesta.radicado, estado: respuesta.estado });
        this.enviando.set(false);
        this.etapa.set('exito');
      },
      error: () => {
        this.enviando.set(false);
        this.errorEnvio.set('No se pudo registrar la gestión. Intenta nuevamente en unos minutos.');
      },
    });
  }

  /** Finaliza la gestión y vuelve al portafolio. */
  protected finalizar(): void {
    void this.router.navigate([RUTA_RENOVACIONES]);
  }

  // --- Privados ------------------------------------------------------------

  private iniciar(flujo: FlujoGestion, etapa: EtapaGestion): void {
    this.reiniciarCaptura();
    this.flujo.set(flujo);
    this.etapa.set(etapa);
  }

  private reiniciarCaptura(): void {
    this.archivo.set(null);
    this.comentarios.set('');
    this.confirmacion.set(null);
    this.errorEnvio.set(null);
  }

  /** Arma el payload de la gestión activa y lo envía al endpoint correspondiente. */
  private registrar(validacionSarlaftId: string): Observable<Confirmacion> {
    const numeroPoliza = this.numeroPoliza();
    const comentarios = this.comentarios().trim();
    const conComentarios = comentarios.length > 0 ? { comentarios } : {};
    const conObservaciones = comentarios.length > 0 ? { observaciones: comentarios } : {};
    const documento = this.documentoCargado();

    switch (this.flujo()) {
      case 'fisica':
        return this.renovacionService.solicitar({
          numeroPoliza,
          tipo: 'fisica',
          validacionSarlaftId,
          ...(documento ? { formularioRenovacion: documento } : {}),
          ...conComentarios,
        });
      case 'digital': {
        const v = this.formulario.getRawValue();
        const observaciones = String(v.observaciones ?? '').trim();
        return this.renovacionService.solicitar({
          numeroPoliza,
          tipo: 'digital',
          validacionSarlaftId,
          modalidad: this.esBloqueado() ? 'mismosValores' : 'conAjustes',
          ...(this.esBloqueado()
            ? {}
            : {
                ajustes: {
                  valorCanon: Number(v.valorCanon),
                  administracion: Number(v.administracion),
                  valorAseguradoServicios: Number(v.valorAseguradoServicios),
                  valorAseguradoDyF: Number(v.valorAseguradoDyF),
                  ipcAplicado: Number(v.ipcAplicado),
                },
              }),
          ...(observaciones ? { comentarios: observaciones } : {}),
        });
      }
      case 'caso-especial':
        return this.renovacionService.casoEspecial({
          numeroPoliza,
          tipo: this.tipoCasoEspecial(),
          documentoLegal: documento!,
          ...conObservaciones,
        });
      case 'no-renovar':
        return this.renovacionService.noRenovar({
          numeroPoliza,
          motivo: this.motivoNoRenovacion() as MotivoNoRenovacion,
          ...conObservaciones,
        });
      case 'correccion':
        return this.correccionService.registrar({
          referencia: numeroPoliza,
          archivo: this.archivo()!,
          ...conObservaciones,
        });
    }
  }

  private documentoCargado(): DocumentoCargado | null {
    const archivo = this.archivo();
    return archivo
      ? {
          nombre: archivo.name,
          tipoMime: archivo.type as DocumentoCargado['tipoMime'],
          tamanoBytes: archivo.size,
        }
      : null;
  }
}
