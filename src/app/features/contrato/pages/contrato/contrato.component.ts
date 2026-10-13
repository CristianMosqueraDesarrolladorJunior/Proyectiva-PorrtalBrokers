import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  computed,
  inject,
  signal,
  type WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  AlertBannerComponent,
  BotonComponent,
  EscaleritaLoaderComponent,
  FormFieldComponent,
  StepTabsComponent,
  SuccessScreenComponent,
} from '../../../../shared/components';
import type { TarjetaSeguimiento } from '../../../../shared/components/success-screen/success-screen.component';
import {
  ContratoService,
  type ContratoArrendamientoResponse,
} from '../../../../core/services/contrato.service';
import type {
  CondicionesEconomicas,
  ContratoArrendamientoRequest,
  DatosArrendador,
  DatosArrendatario,
  DatosInmueble,
  DeudorSolidario,
  DuracionContratoMeses,
  LecturaContratoResponse,
  MetodoPagoContrato,
} from '../../../../core/models/contrato.model';
import { mensajeErrorIntegracion } from '../../../../core/util/errores-integracion';
import { BorradorRadicacionService } from '../../../../core/services/borrador-radicacion.service';
import { CotizadorService } from '../../../../core/services/cotizador.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import type { TipoDocumentoIdentidad } from '../../../../core/models/radicacion.model';
import { CatalogoService } from '../../../../core/services/catalogo.service';
import {
  type OpcionIdentificacion,
  PASOS_CONTRATO,
  ULTIMO_PASO,
  esPasoValido,
  puedeAvanzar,
  puedeGenerar,
  puedeRetroceder,
  esNumeroCuentaValido,
  type EstadoContrato,
} from './contrato-presentacion';

import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { LectorContratoComponent } from '../../components/lector-contrato/lector-contrato.component';
/** Estado del envío del Contrato_Arrendamiento para controlar loader y confirmación (Req 30.7). */
type EstadoEnvioContrato = 'inactivo' | 'enviando' | 'exito';


/**
 * ContratoComponent — Generador_Contrato de Arrendamiento multipaso (Req 30).
 *
 * Presenta un `StepTabsComponent` de 4 pasos (Datos del arrendador → Datos del
 * arrendatario → Datos del inmueble → Condiciones económicas y vigencia) y captura
 * los campos exactos de cada paso con `FormFieldComponent` (Req 30.1–30.5).
 *
 * El avance entre pasos se restringe con la lógica pura reutilizada de
 * `contrato-presentacion` (`puedeAvanzar`/`esPasoValido`): solo se permite avanzar
 * cuando los campos obligatorios del paso actual son válidos (gating, Req 30.6).
 *
 * "Generar contrato" está habilitado solo cuando todos los pasos son válidos
 * (`puedeGenerar`) y solicita la generación al API_Backend mediante `ContratoService`
 * (POST `/api/v1/contratos/arrendamiento`), mostrando la confirmación con
 * `SuccessScreenComponent` (Req 30.7). "Cancelar" emite el evento `cancelado` para
 * regresar a la sección Radicación sin generar el contrato (Req 30.8).
 *
 * El cálculo/validación autoritativo reside en el API_Backend (Req 30.9); esta capa
 * valida por UX y muestra el resultado. Reutiliza componentes compartidos sin
 * duplicar marcado (Req 24.4, 35.21).
 */
@Component({
  selector: 'app-contrato',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent,
    LectorContratoComponent,
    FormsModule,
    StepTabsComponent,
    FormFieldComponent,
    BotonComponent,
    AlertBannerComponent,
    EscaleritaLoaderComponent,
    SuccessScreenComponent,
  ],
  templateUrl: './contrato.component.html',
  styleUrl: './contrato.component.scss',
})
export class ContratoComponent {
  private readonly contratoService = inject(ContratoService);
  private readonly router = inject(Router);
  private readonly borrador = inject(BorradorRadicacionService);
  /** Ciudades del catálogo soportado por el backend (evita `ciudad_no_soportada`). */
  protected readonly ciudades = toSignal(
    inject(CotizadorService)
      .ciudadesPorDepartamento(this.borrador.cotizacion()?.departamento || 'todos')
      .pipe(catchError(() => of([] as readonly string[]))),
    { initialValue: [] as readonly string[] },
  );

  /** Emite cuando el Broker cancela y debe regresar a Radicación (Req 30.8). */
  @Output() readonly cancelado = new EventEmitter<void>();

  /** Emite el radicado tras generar el contrato con éxito (Req 30.7). */
  @Output() readonly generado = new EventEmitter<ContratoArrendamientoResponse>();

  /** Etiquetas de los 4 pasos del Generador_Contrato (Req 30.1). */
  protected readonly pasos = PASOS_CONTRATO;

  /** Tipos de documento de identidad seleccionables con etiqueta (Req 30.2, 30.3). */
  private readonly catalogo = inject(CatalogoService);
  /** Listas del contrato desde los catálogos de BD (Req 30.2–30.5). */
  protected readonly tiposIdentificacion: readonly OpcionIdentificacion[] = this.catalogo
    .opciones('tipo_documento')
    .filter((t) => t['propietario'] === true)
    .map((t) => ({ valor: t.codigo as TipoDocumentoIdentidad, etiqueta: t.descripcion }));

  /** Tipos de inmueble del selector (Req 30.4). */
  protected readonly tiposInmueble = this.catalogo.opciones('tipo_inmueble').map((t) => t.descripcion);

  /** Usos del inmueble del selector (Req 30.4). */
  protected readonly usosInmueble = this.catalogo.opciones('uso_inmueble').map((t) => t.descripcion);

  /** Estratos del selector (Req 30.4). */
  protected readonly estratos = this.catalogo.codigos('estrato').map(Number);

  /** Duraciones del contrato ofrecidas en meses (Req 30.5). */
  protected readonly duraciones = this.catalogo.codigos('duracion_contrato').map((d) => Number(d) as DuracionContratoMeses);

  /** Índice del paso activo (0-indexado). */
  protected readonly pasoActual = signal(0);

  /** Indica si el Broker intentó avanzar/generar (para revelar errores de campo). */
  protected readonly intento = signal(false);

  /** Estado del envío final del contrato (Req 30.7). */
  protected readonly estadoEnvio = signal<EstadoEnvioContrato>('inactivo');

  /** Confirmación de generación devuelta por el backend (Req 30.7). */
  protected readonly confirmacion = signal<ContratoArrendamientoResponse | null>(null);

  /** Mensaje de error genérico, sin exponer detalles internos (Req 28.5). */
  protected readonly errorMensaje = signal('');

  // --- Paso 1: datos del arrendador (Req 30.2) ---
  protected readonly arrNombres = signal('');
  protected readonly arrApellidos = signal('');
  protected readonly arrTipoIdentificacion = signal<TipoDocumentoIdentidad>('CC');
  protected readonly arrNumeroIdentificacion = signal('');
  protected readonly arrTelefono = signal('');
  protected readonly arrCorreo = signal('');
  protected readonly arrDireccion = signal('');
  protected readonly arrCiudadExpedicion = signal('');

  // --- Paso 2: datos del arrendatario (Req 30.3) ---
  protected readonly ateNombres = signal('');
  protected readonly ateApellidos = signal('');
  protected readonly ateTipoIdentificacion = signal<TipoDocumentoIdentidad>('CC');
  protected readonly ateNumeroIdentificacion = signal('');
  protected readonly ateTelefono = signal('');
  protected readonly ateCorreo = signal('');
  protected readonly ateOcupacion = signal('');
  protected readonly ateCiudadExpedicion = signal('');
  protected readonly ateDireccionNotificacion = signal('');

  /** Precarga desde el estudio digital (arrendatario, codeudores, propietario e inmueble). */
  protected readonly estudioConsecutivo = signal('');
  protected readonly cargandoEstudio = signal(false);
  protected readonly mensajeEstudio = signal<{ tipo: 'success' | 'warning' | 'error'; titulo: string; texto: string } | null>(null);
  protected readonly deudores = signal<DeudorSolidario[]>([]);

  // --- Paso 3: datos del inmueble (Req 30.4). Preselección fiel al prototipo. ---
  protected readonly inmTipoInmueble = signal<string>(this.tiposInmueble[0] ?? '');
  protected readonly inmUso = signal<string>(this.usosInmueble[0] ?? '');
  protected readonly inmDireccion = signal('');
  protected readonly inmCiudad = signal('');
  protected readonly inmMatricula = signal('');
  protected readonly inmEstrato = signal<number | null>(4);
  protected readonly inmArea = signal<number | null>(null);
  protected readonly inmLineaTelefonica = signal('');

  // --- Paso 4: condiciones económicas y vigencia (Req 30.5) ---
  protected readonly conCanon = signal<number | null>(null);
  protected readonly conAdministracion = signal<number | null>(null);
  protected readonly conDuracion = signal<DuracionContratoMeses>(12);
  protected readonly conDiaPago = signal<number | null>(null);
  protected readonly conFechaInicio = signal('');
  protected readonly conReajuste = signal('');
  protected readonly conServicios = signal('');
  // El prototipo marca "Incluir deudores solidarios" por defecto.
  protected readonly conDeudoresSolidarios = signal(true);
  protected readonly conMetodoPago = signal<MetodoPagoContrato>('transferencia');
  protected readonly conTipoCuenta = signal('ahorros');
  protected readonly conNumeroCuenta = signal('');
  protected readonly conBanco = signal('');
  protected readonly numeroCuentaValido = computed(() => esNumeroCuentaValido(this.conNumeroCuenta()));
  protected readonly metodosPago: readonly { valor: MetodoPagoContrato; etiqueta: string }[] = [
    { valor: 'transferencia', etiqueta: 'Transferencia bancaria' },
    { valor: 'consignacion', etiqueta: 'Consignación' },
    { valor: 'debito_automatico', etiqueta: 'Débito automático' },
    { valor: 'efectivo', etiqueta: 'Efectivo' },
  ];

  /**
   * Prefill desde el Estudio Digital: cuando se llega a Crear Contrato desde la
   * radicación con un estudio aprobado, se autollenan los campos disponibles del
   * estado de navegación. Los datos del inquilino llegan enmascarados desde el
   * backend (prefill editable que el broker confirma); el inmueble (dirección,
   * ciudad) viene en claro por ser dato operativo del contrato.
   */
  constructor() {
    const estado = this.router.getCurrentNavigation()?.extras.state
      ?? (typeof history !== 'undefined' ? history.state : undefined);
    this.autollenarDesdeEstudio(estado);
    this.autollenarDesdeCotizacion();
  }

  /**
   * Prefill desde la cotización elegida en "Radicar esta cotización": canon, administración, ciudad,
   * uso del inmueble y fecha de inicio quedan diligenciados (editables por el broker).
   */
  private autollenarDesdeCotizacion(): void {
    const cot = this.borrador.cotizacion();
    if (!cot) {
      return;
    }
    this.conCanon.set(cot.canon);
    this.conAdministracion.set(cot.administracion ?? 0);
    this.inmCiudad.set(cot.ciudad);
    this.inmUso.set(/comerc/i.test(cot.tipoInmueble) ? 'Comercial' : 'Habitacional');
    if (cot.fechaInicioVigencia) {
      this.conFechaInicio.set(cot.fechaInicioVigencia);
    }
  }

  /**
   * Autollena los campos del contrato a partir del estado de navegación con el
   * resultado del estudio y el propietario de la radicación.
   * @param estado estado de navegación (puede traer `estudio` y `propietario`).
   */
  private autollenarDesdeEstudio(estado: unknown): void {
    if (!estado || typeof estado !== 'object') {
      return;
    }
    const navegacion = estado as {
      readonly estudio?: {
        readonly inquilino?: string;
        readonly inmueble?: string;
      };
      readonly propietario?: {
        readonly tipoDocumento?: TipoDocumentoIdentidad;
        readonly numeroDocumento?: string;
      };
    };
    const estudio = navegacion.estudio;
    if (estudio?.inquilino) {
      // Nombre completo enmascarado del inquilino como prefill del arrendatario.
      this.ateNombres.set(estudio.inquilino);
    }
    if (estudio?.inmueble) {
      // Dirección operativa del inmueble en claro (uso · tipo · dirección, ciudad).
      this.inmDireccion.set(estudio.inmueble);
    }
    const propietario = navegacion.propietario;
    if (propietario?.tipoDocumento) {
      this.arrTipoIdentificacion.set(propietario.tipoDocumento);
    }
    if (propietario?.numeroDocumento) {
      this.arrNumeroIdentificacion.set(propietario.numeroDocumento);
    }
  }

  /**
   * Precarga la propuesta del lector de contratos: solo pisa los campos que llegaron con valor,
   * lo demás queda como estaba para que el broker lo complete.
   */
  protected precargarDesdeLectura(lectura: LecturaContratoResponse): void {
    const poner = <T>(campo: WritableSignal<T>, valor: T | undefined | null) => {
      if (valor !== undefined && valor !== null && String(valor).trim() !== '') campo.set(valor);
    };
    const { arrendador: arr, arrendatario: ate, inmueble: inm, condiciones: con } = lectura;
    poner(this.arrNombres, arr.nombres);
    poner(this.arrApellidos, arr.apellidos);
    poner(this.arrTipoIdentificacion, arr.tipoIdentificacion);
    poner(this.arrNumeroIdentificacion, arr.numeroIdentificacion);
    poner(this.arrTelefono, arr.telefono);
    poner(this.arrCorreo, arr.correo);
    poner(this.arrDireccion, arr.direccion);
    poner(this.ateNombres, ate.nombres);
    poner(this.ateApellidos, ate.apellidos);
    poner(this.ateTipoIdentificacion, ate.tipoIdentificacion);
    poner(this.ateNumeroIdentificacion, ate.numeroIdentificacion);
    poner(this.ateTelefono, ate.telefono);
    poner(this.ateCorreo, ate.correo);
    poner(this.inmDireccion, inm.direccionCompleta);
    // Solo valores del catálogo: una ciudad o tipo fuera de lista rompería el envío.
    if (inm.ciudad && this.ciudades().includes(inm.ciudad)) this.inmCiudad.set(inm.ciudad);
    if (inm.tipoInmueble && this.tiposInmueble.includes(inm.tipoInmueble)) this.inmTipoInmueble.set(inm.tipoInmueble);
    if (inm.uso && this.usosInmueble.includes(inm.uso)) this.inmUso.set(inm.uso);
    poner(this.inmMatricula, inm.matriculaInmobiliaria);
    poner(this.conCanon, con.canonMensual);
    poner(this.conAdministracion, con.cuotaAdministracion);
    poner(this.conFechaInicio, con.fechaInicio);
    if (con.duracionMeses && (this.duraciones as readonly number[]).includes(con.duracionMeses)) {
      this.conDuracion.set(con.duracionMeses as DuracionContratoMeses);
    }
    if (lectura.deudorSolidario?.nombres) this.conDeudoresSolidarios.set(true);
  }

  /** Estado agregado de los datos por paso, consumido por la lógica pura de gating. */
  protected readonly estado = computed<EstadoContrato>(() => ({
    arrendador: this.datosArrendador(),
    arrendatario: this.datosArrendatario(),
    inmueble: this.datosInmueble(),
    condiciones: this.datosCondiciones(),
  }));

  /** Verdadero si el paso actual es válido (Req 30.6). */
  protected readonly pasoActualValido = computed(() =>
    esPasoValido(this.pasoActual(), this.estado()),
  );

  /** Habilitación del botón "Siguiente": gating de avance (Property 22, Req 30.6). */
  protected readonly avanceHabilitado = computed(() =>
    puedeAvanzar(this.pasoActual(), this.estado()),
  );

  /** Verdadero si se puede retroceder al paso anterior (Req 30.1). */
  protected readonly retrocesoHabilitado = computed(() =>
    puedeRetroceder(this.pasoActual()),
  );

  /** Verdadero si el paso actual es el último (condiciones económicas) (Req 30.5). */
  protected readonly esUltimoPaso = computed(() => this.pasoActual() === ULTIMO_PASO);

  /** Habilitación de "Generar contrato": todos los pasos válidos (Req 30.7). */
  protected readonly generacionHabilitada = computed(() => puedeGenerar(this.estado()));

  /** Verdadero mientras se solicita la generación al backend (Req 30.7). */
  protected readonly enviando = computed(() => this.estadoEnvio() === 'enviando');

  /** Verdadero cuando la generación finalizó con éxito (Req 30.7). */
  protected readonly envioExitoso = computed(() => this.estadoEnvio() === 'exito');

  /** Tarjetas de seguimiento de la pantalla de éxito (radicado y estado) (Req 30.7). */
  /** Trae del estudio digital al arrendatario, los codeudores (deudores solidarios), el propietario y el inmueble. */
  protected precargarDeEstudio(): void {
    const consecutivo = this.estudioConsecutivo().trim();
    const documento = this.ateNumeroIdentificacion().trim();
    if (!consecutivo || !documento) {
      this.mensajeEstudio.set({ tipo: 'warning', titulo: 'Faltan datos', texto: 'Escribe el número de estudio y el documento del arrendatario evaluado.' });
      return;
    }
    this.cargandoEstudio.set(true);
    this.mensajeEstudio.set(null);
    this.contratoService.prellenado(consecutivo, documento, this.ateTipoIdentificacion()).subscribe({
      next: (p) => {
        this.cargandoEstudio.set(false);
        const a = p.arrendatario;
        if (a) {
          this.ateNombres.set(a.nombres ?? this.ateNombres());
          this.ateApellidos.set(a.apellidos ?? this.ateApellidos());
          this.ateTelefono.set(a.telefono ?? this.ateTelefono());
          this.ateCorreo.set(a.correo ?? this.ateCorreo());
          this.ateDireccionNotificacion.set(a.direccionNotificacion ?? this.ateDireccionNotificacion());
        }
        if (p.arrendador?.nombres && !this.arrNombres().trim()) {
          this.arrNombres.set(p.arrendador.nombres);
          if (p.arrendador.numeroIdentificacion) {
            this.arrNumeroIdentificacion.set(p.arrendador.numeroIdentificacion);
          }
        }
        const inm = p.inmueble;
        if (inm) {
          if (inm.direccion && !this.inmDireccion().trim()) this.inmDireccion.set(inm.direccion);
          if (inm.ciudad && !this.inmCiudad().trim()) this.inmCiudad.set(inm.ciudad);
          if (inm.canon && this.conCanon() === null) this.conCanon.set(Number(inm.canon) || null);
          if (inm.administracion && this.conAdministracion() === null) this.conAdministracion.set(Number(inm.administracion) || null);
        }
        this.deudores.set(p.deudores.slice(0, 2).map((d) => ({
          nombres: d.nombres ?? '',
          apellidos: d.apellidos ?? '',
          tipoIdentificacion: d.tipoIdentificacion ?? 'CC',
          numeroIdentificacion: d.numeroIdentificacion ?? '',
          ciudadExpedicion: '',
          direccionNotificacion: d.direccionNotificacion ?? '',
          telefono: d.telefono ?? '',
          correo: d.correo ?? '',
        })));
        if (this.deudores().length) {
          this.conDeudoresSolidarios.set(true);
        }
        this.mensajeEstudio.set({
          tipo: 'success',
          titulo: 'Datos del estudio cargados',
          texto: `Arrendatario${this.deudores().length ? ` y ${this.deudores().length} deudor(es) solidario(s)` : ''} precargados. Revísalos y completa la ciudad de expedición.`,
        });
      },
      error: (err: { status?: number }) => {
        this.cargandoEstudio.set(false);
        this.mensajeEstudio.set(err?.status === 404
          ? { tipo: 'warning', titulo: 'Estudio no encontrado', texto: 'Revisa el número de estudio y el documento del arrendatario.' }
          : { tipo: 'error', titulo: 'No se pudo consultar', texto: 'El estudio digital no respondió. Intenta de nuevo o diligencia los datos a mano.' });
      },
    });
  }

  protected editarDeudor(i: number, campo: keyof DeudorSolidario, valor: string): void {
    this.deudores.update((lista) => lista.map((d, j) => (j === i ? { ...d, [campo]: valor } : d)));
  }

  protected agregarDeudor(): void {
    this.deudores.update((lista) => lista.length >= 2 ? lista : [...lista, {
      nombres: '', apellidos: '', tipoIdentificacion: 'CC', numeroIdentificacion: '', ciudadExpedicion: '',
      direccionNotificacion: '', telefono: '', correo: '',
    }]);
  }

  protected quitarDeudor(i: number): void {
    this.deudores.update((lista) => lista.filter((_, j) => j !== i));
  }

  protected readonly descargando = signal(false);
  protected readonly errorDescarga = signal('');

  /** Descarga el contrato en Word: el backend usa la plantilla de vivienda o comercio según el uso del inmueble. */
  protected descargarContrato(): void {
    const referencia = this.confirmacion()?.radicado;
    if (!referencia || this.descargando()) {
      return;
    }
    this.descargando.set(true);
    this.errorDescarga.set('');
    this.contratoService.descargarDocumento(referencia).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `Contrato-${referencia}.docx`;
        enlace.click();
        URL.revokeObjectURL(url);
        this.descargando.set(false);
      },
      error: () => {
        this.descargando.set(false);
        this.errorDescarga.set('No fue posible generar el documento del contrato. Intenta nuevamente.');
      },
    });
  }

  protected readonly tarjetasConfirmacion = computed<readonly TarjetaSeguimiento[]>(() => {
    const respuesta = this.confirmacion();
    if (respuesta === null) {
      return [];
    }
    return [
      { etiqueta: 'RADICADO', valor: respuesta.radicado },
      { etiqueta: 'ESTADO', valor: respuesta.estado },
    ];
  });

  /**
   * Avanza al siguiente paso si el paso actual es válido (gating, Req 30.6).
   * Marca el intento para revelar errores; si es inválido, no avanza.
   */
  protected siguiente(): void {
    this.intento.set(true);
    this.errorMensaje.set('');
    if (!this.avanceHabilitado()) {
      return;
    }
    this.intento.set(false);
    this.pasoActual.update((paso) => paso + 1);
  }

  /** Vuelve a un paso ya completado desde las pestañas de pasos (Req 30.1). */
  protected irAPaso(indice: number): void {
    if (indice < 0 || indice >= this.pasoActual()) {
      return;
    }
    this.intento.set(false);
    this.errorMensaje.set('');
    this.pasoActual.set(indice);
  }

  /** Retrocede al paso anterior sin perder los datos capturados (Req 30.1). */
  protected anterior(): void {
    if (!this.retrocesoHabilitado()) {
      return;
    }
    this.intento.set(false);
    this.errorMensaje.set('');
    this.pasoActual.update((paso) => paso - 1);
  }

  /**
   * Solicita la generación del Contrato_Arrendamiento al API_Backend (Req 30.7).
   * Requiere que todos los pasos sean válidos; el backend revalida (Req 30.9).
   */
  protected generar(): void {
    this.intento.set(true);
    this.errorMensaje.set('');
    if (!this.generacionHabilitada() || this.enviando()) {
      return;
    }
    const request = this.construirRequest();
    if (request === null) {
      this.errorMensaje.set('Completa los datos requeridos antes de generar el contrato.');
      return;
    }
    this.estadoEnvio.set('enviando');
    this.contratoService.generar(request).subscribe({
      next: (respuesta) => {
        this.confirmacion.set(respuesta);
        // La radicación exige este contrato: queda registrado en el borrador del flujo.
        this.borrador.contrato.set({ referencia: respuesta.radicado });
        this.estadoEnvio.set('exito');
        this.generado.emit(respuesta);
      },
      error: (err: unknown) => {
        this.estadoEnvio.set('inactivo');
        this.errorMensaje.set(mensajeErrorIntegracion(err));
      },
    });
  }

  /** Cancela el Generador_Contrato y regresa a Radicación sin generar (Req 30.8). */
  protected cancelar(): void {
    this.cancelado.emit();
    void this.router.navigate(['/app/radicacion']);
  }

  /** Cierra la confirmación de éxito regresando a Radicación (Req 30.7, 30.8). */
  protected volverARadicacion(): void {
    this.cancelado.emit();
    void this.router.navigate(['/app/radicacion']);
  }

  // --- Ensamblado del estado parcial por paso (para la lógica pura de gating) ------

  /** Datos del arrendador capturados como estado parcial (Req 30.2). */
  private datosArrendador(): Partial<DatosArrendador> {
    return {
      nombres: this.arrNombres(),
      apellidos: this.arrApellidos(),
      tipoIdentificacion: this.arrTipoIdentificacion(),
      numeroIdentificacion: this.arrNumeroIdentificacion(),
      telefono: this.arrTelefono(),
      correo: this.arrCorreo(),
      direccionResidencia: this.arrDireccion(),
    };
  }

  /** Datos del arrendatario capturados como estado parcial (Req 30.3). */
  private datosArrendatario(): Partial<DatosArrendatario> {
    return {
      nombres: this.ateNombres(),
      apellidos: this.ateApellidos(),
      tipoIdentificacion: this.ateTipoIdentificacion(),
      numeroIdentificacion: this.ateNumeroIdentificacion(),
      telefono: this.ateTelefono(),
      correo: this.ateCorreo(),
      ocupacion: this.ateOcupacion(),
    };
  }

  /** Datos del inmueble capturados como estado parcial (Req 30.4). */
  private datosInmueble(): Partial<DatosInmueble> {
    return {
      tipoInmueble: this.inmTipoInmueble(),
      uso: this.inmUso(),
      direccionCompleta: this.inmDireccion(),
      ciudad: this.inmCiudad(),
      matriculaInmobiliaria: this.inmMatricula(),
      ...(this.inmEstrato() !== null ? { estrato: this.inmEstrato() as number } : {}),
      ...(this.inmArea() !== null ? { areaMetrosCuadrados: this.inmArea() as number } : {}),
    };
  }

  /** Condiciones económicas capturadas como estado parcial (Req 30.5). */
  private datosCondiciones(): Partial<CondicionesEconomicas> {
    return {
      ...(this.conCanon() !== null ? { canonMensual: this.conCanon() as number } : {}),
      ...(this.conAdministracion() !== null
        ? { cuotaAdministracion: this.conAdministracion() as number }
        : {}),
      duracionMeses: this.conDuracion(),
      ...(this.conDiaPago() !== null ? { diaPagoMensual: this.conDiaPago() as number } : {}),
      fechaInicio: this.conFechaInicio(),
      reajusteAnual: this.conReajuste(),
      serviciosIncluidos: this.serviciosComoLista(),
      incluyeDeudoresSolidarios: this.conDeudoresSolidarios(),
      ...this.datosPago(),
    };
  }

  /** Método de pago y cuenta (la cuenta no aplica en efectivo). */
  private datosPago(): Pick<CondicionesEconomicas, 'metodoPago' | 'tipoCuenta' | 'numeroCuenta'> {
    const metodoPago = this.conMetodoPago();
    return metodoPago === 'efectivo'
      ? { metodoPago }
      : { metodoPago, tipoCuenta: this.conTipoCuenta(), numeroCuenta: this.conNumeroCuenta().trim() };
  }

  /** Convierte el texto de servicios en una lista (separada por comas), sin vacíos. */
  private serviciosComoLista(): readonly string[] {
    return this.conServicios()
      .split(',')
      .map((servicio) => servicio.trim())
      .filter((servicio) => servicio.length > 0);
  }

  /**
   * Construye el `ContratoArrendamientoRequest` completo si todos los pasos son válidos.
   * @returns la solicitud, o `null` si falta información obligatoria.
   */
  private construirRequest(): ContratoArrendamientoRequest | null {
    if (!this.generacionHabilitada()) {
      return null;
    }
    const arrendador: DatosArrendador = {
      nombres: this.arrNombres().trim(),
      apellidos: this.arrApellidos().trim(),
      tipoIdentificacion: this.arrTipoIdentificacion(),
      numeroIdentificacion: this.arrNumeroIdentificacion().trim(),
      telefono: this.arrTelefono().trim(),
      correo: this.arrCorreo().trim(),
      direccionResidencia: this.arrDireccion().trim(),
      ciudadExpedicion: this.arrCiudadExpedicion().trim(),
      direccionNotificacion: this.arrDireccion().trim(),
    };
    const arrendatario: DatosArrendatario = {
      nombres: this.ateNombres().trim(),
      apellidos: this.ateApellidos().trim(),
      tipoIdentificacion: this.ateTipoIdentificacion(),
      numeroIdentificacion: this.ateNumeroIdentificacion().trim(),
      telefono: this.ateTelefono().trim(),
      correo: this.ateCorreo().trim(),
      ocupacion: this.ateOcupacion().trim(),
      ciudadExpedicion: this.ateCiudadExpedicion().trim(),
      direccionNotificacion: this.ateDireccionNotificacion().trim(),
    };
    const inmueble: DatosInmueble = {
      tipoInmueble: this.inmTipoInmueble().trim(),
      uso: this.inmUso().trim(),
      direccionCompleta: this.inmDireccion().trim(),
      ciudad: this.inmCiudad().trim(),
      matriculaInmobiliaria: this.inmMatricula().trim(),
      estrato: this.inmEstrato() as number,
      areaMetrosCuadrados: this.inmArea() as number,
      lineaTelefonica: this.inmLineaTelefonica().trim(),
    };
    const condiciones: CondicionesEconomicas = {
      canonMensual: this.conCanon() as number,
      cuotaAdministracion: this.conAdministracion() as number,
      duracionMeses: this.conDuracion(),
      diaPagoMensual: this.conDiaPago() as number,
      fechaInicio: this.conFechaInicio().trim(),
      reajusteAnual: this.conReajuste().trim(),
      serviciosIncluidos: this.serviciosComoLista(),
      incluyeDeudoresSolidarios: this.conDeudoresSolidarios(),
      ...this.datosPago(),
      ...(this.conMetodoPago() !== 'efectivo' && this.conBanco().trim() ? { banco: this.conBanco().trim() } : {}),
    };
    const deudores = this.conDeudoresSolidarios()
      ? this.deudores().filter((d) => d.nombres.trim() && d.numeroIdentificacion.trim())
      : [];
    const cotizacionReferencia = this.borrador.cotizacion()?.referencia;
    return {
      arrendador,
      arrendatario,
      inmueble,
      condiciones,
      ...(cotizacionReferencia ? { cotizacionReferencia } : {}),
      ...(deudores.length ? { deudores } : {}),
    };
  }
}
