import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CatalogoService } from '../../../../core/services/catalogo.service';
import { GUIA_RENOVACION } from '../../../../core/onboarding/guion-tour';
import { TourBienvenidaService } from '../../../../core/onboarding/tour-bienvenida.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, catchError, debounceTime, of, switchMap, type Observable } from 'rxjs';

import type {
  SarlaftRenovacionAceptado,
  TipoCasoEspecial,
  CondicionesRenovacion,
  PropuestaRenovacion,
} from '../../../../core/models/renovacion.model';
import { RenovacionService } from '../../../../core/services/renovacion.service';
import type { Poliza } from '../../../../core/models/poliza.model';
import { accionDe } from '../../renovaciones-lista';
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
import { FormatoRenovacionComponent } from '../../components/formato-renovacion/formato-renovacion.component';
import { SarlaftRenovacionComponent } from '../../components/sarlaft-renovacion/sarlaft-renovacion.component';
import {
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
  puedeEnviarNoRenovacion,
} from '../../no-renovacion-habilitacion';
import { FeedbackService } from '../../../../shared/services/feedback/feedback.service';

/** Modalidad de renovación digital elegida en Detalles. */
type ModalidadDetalle = 'anterior' | 'ajustar' | null;

/** Modo del paso Ajuste: bloqueado (mismos valores) o editable (con ajustes). */
type ModoAjuste = 'bloqueado' | 'editable';

/** `2026-04-01` → `01/04/2026`. */
function fechaCorta(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split('-');
  return d && m && a ? `${d}/${m}/${a}` : iso;
}

/** Ruta de retorno al portafolio de renovaciones. */
const RUTA_RENOVACIONES = '/app/renovaciones';

/**
 * Detalle de la póliza mostrado en el paso Detalles. Los datos de identificación
 * (cobertura, vencimiento) provienen de la póliza real del portafolio del
 * backend; los valores económicos los captura el broker en el formulario de
 * ajuste. `null` mientras no se resuelva la póliza del portafolio.
 */
interface DatosPoliza {
  readonly numero: string;
  readonly tipoCobertura: string;
  readonly fechaVencimiento: Date | null;
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
    FormatoRenovacionComponent,
  ],
  templateUrl: './gestion-renovacion.component.html',
  styleUrl: './gestion-renovacion.component.scss',
})
export class GestionRenovacionComponent {
  private readonly feedback = inject(FeedbackService);
  private readonly catalogo = inject(CatalogoService);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly renovacionService = inject(RenovacionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly tour = inject(TourBienvenidaService);

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
  protected readonly numeroPoliza = signal('');

  /** Póliza real del portafolio del backend que coincide con `numeroPoliza`. */
  private readonly polizaReal = signal<Poliza | null>(null);

  /**
   * Cerrada por el área (renovada, desistida, desocupación…) o en proceso con el área (en expedición, caso especial):
   * solo se consulta, ya no se gestiona. Misma regla que la lista y que la consola.
   */
  protected readonly cierre = computed(() => {
    const p = this.polizaReal();
    if (!p) return null;
    const accion = accionDe(p);
    if (accion !== 'CERRADA' && accion !== 'EN_PROCESO') return null;
    const titulo = accion === 'EN_PROCESO'
      ? 'Esta renovación ya está en proceso con el área'
      : p.estado === 'RENOVADA' ? 'Esta póliza ya está renovada' : 'El área ya cerró esta póliza sin renovar';
    return { titulo, motivo: p.estadoWarehouse || p.gestion || '', pagada: !!p.pagada };
  });

  /** Póliza que vence según el Warehouse (col B) y propuestas cotizadas por el backend. */
  protected readonly condiciones = signal<CondicionesRenovacion | null>(null);

  /** Propuesta vigente del paso Ajuste (se recotiza en el backend al cambiar valores o IPC). */
  protected readonly propuesta = signal<PropuestaRenovacion | null>(null);
  protected readonly cotizando = signal(false);
  private readonly recotizar$ = new Subject<{ conCanon: boolean }>();

  /** Diálogo de confirmación antes de "No renovar". */
  protected readonly mostrarConfirmacionNoRenovar = signal(false);

  // --- Captura común (archivo + texto) ------------------------------------

  /** Archivo cargado en la etapa de captura (formulario, documento legal o corrección). */
  protected readonly archivo = signal<File | null>(null);
  /** SARLAFT actualizado que cargó el broker en el paso SARLAFT (viaja con la gestión). */
  private sarlaftActualizado: File | null = null;

  /** Comentarios / observaciones de la gestión activa. */
  protected readonly comentarios = signal('');

  /** Máximo de caracteres de observaciones. */
  protected readonly maxCaracteres = 500;

  // --- Caso especial y no renovar -----------------------------------------

  protected readonly tipoCasoEspecial = signal<TipoCasoEspecial>('');
  /** Procesos especiales que el broker puede iniciar (catálogo `tipo_caso_especial` con `para_broker`). */
  protected readonly opcionesCasoEspecial = computed<readonly OpcionRadio[]>(() =>
    this.catalogo
      .opciones('tipo_caso_especial')
      .filter((t) => t['para_broker'] === true)
      .map((t) => ({ valor: t.codigo, etiqueta: t.descripcion })),
  );

  protected readonly motivoNoRenovacion = signal<string>('');
  /** Motivos reales del Warehouse (catálogo `motivo_no_renovacion`); se envía el valor que escribe el área. */
  protected readonly opcionesMotivo = computed<readonly OpcionRadio[]>(() =>
    this.catalogo.opciones('motivo_no_renovacion').filter((m) => m['para_broker'] === true).map((m) => ({ valor: m.descripcion, etiqueta: m.descripcion })),
  );
  protected readonly motivoValido = computed(() =>
    puedeEnviarNoRenovacion(this.motivoNoRenovacion(), this.opcionesMotivo().map((o) => o.valor)),
  );

  // --- Renovación digital --------------------------------------------------

  protected readonly modoAjuste = signal<ModoAjuste>('bloqueado');
  protected readonly modalidadSeleccionada = signal<ModalidadDetalle>(null);
  protected readonly esBloqueado = computed(() => this.modoAjuste() === 'bloqueado');

  /** Formulario del paso Ajuste. Los valores los captura el broker (sin precargar). */
  protected readonly formulario: FormGroup = this.fb.group({
    valorCanon: [null, [Validators.required, Validators.min(1)]],
    administracion: [null, [Validators.required, Validators.min(0)]],
    valorAseguradoServicios: [null, [Validators.required, Validators.min(0)]],
    valorAseguradoDyF: [null, [Validators.required, Validators.min(0)]],
    periodoActual: [''],
    periodoProyectado: [''],
    ipcAplicado: [null],
    observaciones: ['', [Validators.maxLength(500)]],
  });

  /**
   * Detalle de la póliza para la vista: identificación tomada de la póliza real
   * del portafolio del backend (cobertura y vencimiento) y valores económicos
   * tomados del formulario que edita el broker. No se usan datos simulados.
   */
  protected readonly poliza = computed<DatosPoliza>(() => {
    const real = this.polizaReal();
    const c = this.condiciones();
    const vence = c?.vencimiento ?? real?.fechaVencimiento ?? null;
    return {
      numero: this.numeroPoliza(),
      tipoCobertura: c?.destino ? `${real?.producto ?? 'Arrendamiento'} · ${c.destino}` : (real?.producto ?? '—'),
      fechaVencimiento: vence ? new Date(`${vence}T00:00:00`) : null,
      valorMensual: c?.canon ?? 0,
      administracion: c?.administracion ?? 0,
      serviciosPublicos: c?.valorAseguradoServicios ?? 0,
      danosFaltantes: c?.valorAseguradoDyf ?? 0,
    };
  });

  /** Valor de renovar con las mismas condiciones (cotización «anterior» del backend). */
  protected readonly totalEstimado = computed(() => this.condiciones()?.anterior.cotizacion.granTotal ?? 0);

  /** Motivo que escribió el área al pedir la corrección (columna G del Warehouse). */
  protected readonly motivoCorreccion = computed(
    () => this.condiciones()?.motivoCorreccion || 'Revisa y vuelve a cargar el documento que te pedimos.',
  );

  /** Alertas de la cotización (las mismas que en Comercial renovaciones exigen proceso especial o corrección). */
  protected readonly alertas = computed(() => this.propuesta()?.cotizacion.alertas ?? []);
  protected readonly requiereOtroSi = computed(() =>
    this.alertas().some((a) => a === 'ipc_supera_tope' || a === 'vigencia_restringida'),
  );

  // --- Envío tras SARLAFT vigente -----------------------------------------

  protected readonly enviando = signal(false);
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
    // Guía de esta vista: se abre sola la primera vez y «Ver recorrido» la reabre mientras se gestiona la póliza.
    this.tour.registrarGuia('renovacion', GUIA_RENOVACION);
    this.destroyRef.onDestroy(() => this.tour.limpiarGuia());
    this.recotizar$
      .pipe(debounceTime(350), switchMap((o) => this.cotizarNueva(o.conCanon)), takeUntilDestroyed())
      .subscribe((p) => {
        this.cotizando.set(false);
        if (p) {
          this.propuesta.set(p);
          this.formulario.patchValue({ valorCanon: p.canon }, { emitEvent: false });
        }
      });
    this.formulario.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (!this.esBloqueado() && this.etapa() === 'ajuste') {
        this.recotizar$.next({ conCanon: true });
      }
    });
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const numero = params.get('numeroPolizaInicial');
      this.numeroPoliza.set(numero && numero.trim().length > 0 ? numero.trim().replace(/^#/, '') : '');
      this.cargarPolizaReal();
    });
  }

  /**
   * Resuelve la póliza del portafolio real del backend que coincide con el
   * número recibido, para mostrar su cobertura y vencimiento. Si no se encuentra
   * o falla la consulta, la vista muestra valores neutros (sin datos simulados).
   */
  private cargarPolizaReal(): void {
    const numero = this.numeroPoliza();
    if (!numero) {
      this.polizaReal.set(null);
      return;
    }
    this.renovacionService
      .portafolio()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (portafolio) => {
          const encontrada = portafolio.polizas.find((p) => p.numero === numero) ?? null;
          // Una vencida solo sigue por la inducción.
          if (encontrada && accionDe(encontrada) === 'INDUCCION') {
            void this.router.navigate(['/app/renovaciones/induccion'], { queryParams: { poliza: numero } });
            return;
          }
          this.polizaReal.set(encontrada);
        },
        error: () => this.polizaReal.set(null),
      });
    this.renovacionService
      .condiciones(numero)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (c) => this.condiciones.set(c), error: () => this.condiciones.set(null) });
  }

  /** Cotiza la modalidad «nueva» con lo que hay en el formulario; sin canon, el backend lo calcula con el IPC. */
  private cotizarNueva(conCanon: boolean): Observable<PropuestaRenovacion | null> {
    const v = this.formulario.getRawValue();
    const actual = this.propuesta();
    this.cotizando.set(true);
    return this.renovacionService
      .cotizar(this.numeroPoliza(), {
        modalidad: 'nueva',
        ipc: Number(v.ipcAplicado ?? 0),
        ...(conCanon ? { canon: Number(v.valorCanon) || 0 } : {}),
        administracion: Number(v.administracion) || 0,
        valorAseguradoServicios: Number(v.valorAseguradoServicios) || 0,
        valorAseguradoDyF: Number(v.valorAseguradoDyF) || 0,
        ...(actual ? { fechaInicio: actual.inicio, fechaFin: actual.fin } : {}),
      })
      .pipe(catchError(() => of(null)));
  }

  /** Carga en el formulario la propuesta elegida (valores, IPC y vigencias). */
  private aplicarPropuesta(p: PropuestaRenovacion): void {
    const c = this.condiciones();
    const rango = (a: string | null | undefined, b: string | null | undefined) =>
      a && b ? `${fechaCorta(a)} – ${fechaCorta(b)}` : '—';
    this.propuesta.set(p);
    this.formulario.patchValue(
      {
        valorCanon: p.canon,
        administracion: p.administracion,
        valorAseguradoServicios: p.valorAseguradoServicios,
        valorAseguradoDyF: p.valorAseguradoDyf,
        ipcAplicado: p.ipc,
        periodoActual: rango(c?.vigencia, c?.vencimiento),
        periodoProyectado: rango(p.inicio, p.fin),
      },
      { emitEvent: false },
    );
  }

  // --- Opciones --------------------------------------------------------------

  protected iniciarRenovacionFisica(): void {
    this.iniciar('fisica', 'captura');
  }

  protected iniciarRenovacionDigital(): void {
    this.modalidadSeleccionada.set(null);
    this.iniciar('digital', 'detalles');
  }

  protected iniciarCasoEspecial(tipo?: TipoCasoEspecial): void {
    this.tipoCasoEspecial.set(tipo ?? this.opcionesCasoEspecial()[0]?.valor ?? '');
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
    const c = this.condiciones();
    if (c) {
      this.aplicarPropuesta(modalidad === 'anterior' ? c.anterior : c.nueva);
    }
    if (modo === 'bloqueado') {
      this.formulario.disable();
    } else {
      this.formulario.enable();
    }
    this.etapa.set('ajuste');
  }

  protected incrementarIpc(): void {
    const actual = Number(this.formulario.get('ipcAplicado')?.value ?? 0);
    this.formulario.patchValue({ ipcAplicado: +(actual + 0.1).toFixed(1) }, { emitEvent: false });
    this.recotizar$.next({ conCanon: false });
  }

  protected decrementarIpc(): void {
    const actual = Number(this.formulario.get('ipcAplicado')?.value ?? 0);
    if (actual > 0) {
      this.formulario.patchValue({ ipcAplicado: +(actual - 0.1).toFixed(1) }, { emitEvent: false });
      this.recotizar$.next({ conCanon: false });
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
  protected onSarlaftVigente(resultado: SarlaftRenovacionAceptado): void {
    this.sarlaftActualizado = resultado.sarlaftActualizado ?? null;
    this.enviar(resultado.validacionId);
  }

  /** No renovar se registra sin validar Conocimiento de Cliente. */
  protected enviarNoRenovacion(): void {
    if (this.motivoValido()) {
      this.enviar('');
    }
  }

  private enviar(validacionSarlaftId: string): void {
    if (this.enviando()) {
      return;
    }
    this.enviando.set(true);
    this.registrar(validacionSarlaftId).subscribe({
      next: (respuesta) => {
        this.confirmacion.set({ radicado: respuesta.radicado, estado: respuesta.estado });
        this.enviando.set(false);
        this.etapa.set('exito');
      },
      error: (err: { status?: number; error?: { fields?: string[] } }) => {
        this.enviando.set(false);
        const campos = err?.error?.fields ?? [];
        this.feedback.error({
          titulo: 'No se pudo enviar',
          mensaje:
            err?.status === 422 && campos.includes('ipcAplicado')
              ? 'Ese IPC supera el tope permitido: la renovación va por Otro Sí. Radícala como caso especial.'
              : err?.status === 422 && campos.includes('fechaInicio')
                ? 'Con esa vigencia la renovación va por Otro Sí. Radícala como caso especial.'
                : campos.includes('fechaFin')
                  ? 'La fecha de fin debe ser posterior a la de inicio.'
                  : campos.includes('valorAseguradoDyF')
                    ? 'El valor asegurado de daños y faltantes está por debajo del mínimo.'
                    : err?.status === 422 && this.flujo() === 'correccion'
              ? 'Esta póliza no tiene una corrección pendiente.'
              : err?.status === 422 || err?.status === 400
                ? 'Revisa los datos y documentos de la gestión: no los pudimos recibir así.'
                : 'No se pudo registrar la gestión. Intenta de nuevo en unos minutos.',
        });
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
    this.sarlaftActualizado = null;
    this.comentarios.set('');
    this.confirmacion.set(null);
  }

  /** Arma el payload de la gestión activa y lo envía al endpoint correspondiente. */
  private registrar(validacionSarlaftId: string): Observable<Confirmacion> {
    const numeroPoliza = this.numeroPoliza();
    const comentarios = this.comentarios().trim();
    const conComentarios = comentarios.length > 0 ? { comentarios } : {};
    const conObservaciones = comentarios.length > 0 ? { observaciones: comentarios } : {};
    const archivo = this.archivo();
    const conSarlaft = this.sarlaftActualizado ? { sarlaftActualizado: this.sarlaftActualizado } : {};

    switch (this.flujo()) {
      case 'fisica':
        return this.renovacionService.solicitar({
          numeroPoliza,
          tipo: 'fisica',
          validacionSarlaftId,
          ...(archivo ? { formularioRenovacion: archivo } : {}),
          ...conComentarios,
          ...conSarlaft,
        });
      case 'digital': {
        const v = this.formulario.getRawValue();
        const observaciones = String(v.observaciones ?? '').trim();
        return this.renovacionService.solicitar({
          numeroPoliza,
          tipo: 'digital',
          validacionSarlaftId,
          modalidad: this.esBloqueado() ? 'mismosValores' : 'conAjustes',
          ...(this.propuesta() ? { fechaInicio: this.propuesta()!.inicio, fechaFin: this.propuesta()!.fin } : {}),
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
          ...conSarlaft,
        });
      }
      case 'caso-especial':
        return this.renovacionService.casoEspecial({
          numeroPoliza,
          tipo: this.tipoCasoEspecial(),
          documentos: archivo ? [archivo] : [],
          observaciones: comentarios,
          ...conSarlaft,
        });
      case 'no-renovar':
        return this.renovacionService.noRenovar({
          numeroPoliza,
          motivo: this.motivoNoRenovacion(),
          ...conObservaciones,
        });
      case 'correccion':
        return this.renovacionService.corregir({
          numeroPoliza,
          documentos: archivo ? [archivo] : [],
          ...conObservaciones,
          ...conSarlaft,
        });
    }
  }

}
