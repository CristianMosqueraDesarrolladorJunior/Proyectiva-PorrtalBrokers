import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  AlertBannerComponent,
  BotonComponent,
  EscaleritaLoaderComponent,
  FormFieldComponent,
  StepperComponent,
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
  DuracionContratoMeses,
} from '../../../../core/models/contrato.model';
import type { TipoDocumentoIdentidad } from '../../../../core/models/radicacion.model';
import {
  DURACIONES_CONTRATO,
  PASOS_CONTRATO,
  ULTIMO_PASO,
  esPasoValido,
  puedeAvanzar,
  puedeGenerar,
  puedeRetroceder,
  type EstadoContrato,
} from './contrato-presentacion';

/** Estado del envío del Contrato_Arrendamiento para controlar loader y confirmación (Req 30.7). */
type EstadoEnvioContrato = 'inactivo' | 'enviando' | 'exito';

/** Opción de identificación con su código y etiqueta legible (Req 30.2, 30.3). */
interface OpcionIdentificacion {
  readonly valor: TipoDocumentoIdentidad;
  readonly etiqueta: string;
}

/** Tipos de identificación con etiqueta legible, fiel al prototipo (Req 30.2, 30.3). */
const TIPOS_IDENTIFICACION: readonly OpcionIdentificacion[] = [
  { valor: 'CC', etiqueta: 'Cédula de ciudadanía' },
  { valor: 'CE', etiqueta: 'Cédula de extranjería' },
  { valor: 'NIT', etiqueta: 'NIT' },
  { valor: 'PA', etiqueta: 'Pasaporte' },
];

/** Tipos de inmueble del prototipo (paso 3, Req 30.4). */
const TIPOS_INMUEBLE_CONTRATO: readonly string[] = [
  'Vivienda urbana',
  'Vivienda rural',
  'Local comercial',
  'Oficina',
  'Bodega',
];

/** Usos del inmueble del prototipo (paso 3, Req 30.4). */
const USOS_INMUEBLE: readonly string[] = ['Habitacional', 'Comercial', 'Mixto'];

/** Estratos seleccionables del prototipo (paso 3, Req 30.4). */
const ESTRATOS: readonly number[] = [1, 2, 3, 4, 5, 6];

/**
 * ContratoComponent — Generador_Contrato de Arrendamiento multipaso (Req 30).
 *
 * Presenta un `StepperComponent` de 4 pasos (Datos del arrendador → Datos del
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
  imports: [
    FormsModule,
    StepperComponent,
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

  /** Emite cuando el Broker cancela y debe regresar a Radicación (Req 30.8). */
  @Output() readonly cancelado = new EventEmitter<void>();

  /** Emite el radicado tras generar el contrato con éxito (Req 30.7). */
  @Output() readonly generado = new EventEmitter<ContratoArrendamientoResponse>();

  /** Etiquetas de los 4 pasos del Generador_Contrato (Req 30.1). */
  protected readonly pasos = PASOS_CONTRATO;

  /** Tipos de documento de identidad seleccionables con etiqueta (Req 30.2, 30.3). */
  protected readonly tiposIdentificacion = TIPOS_IDENTIFICACION;

  /** Tipos de inmueble del selector (Req 30.4). */
  protected readonly tiposInmueble = TIPOS_INMUEBLE_CONTRATO;

  /** Usos del inmueble del selector (Req 30.4). */
  protected readonly usosInmueble = USOS_INMUEBLE;

  /** Estratos del selector (Req 30.4). */
  protected readonly estratos = ESTRATOS;

  /** Duraciones del contrato ofrecidas en meses (Req 30.5). */
  protected readonly duraciones = DURACIONES_CONTRATO;

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

  // --- Paso 2: datos del arrendatario (Req 30.3) ---
  protected readonly ateNombres = signal('');
  protected readonly ateApellidos = signal('');
  protected readonly ateTipoIdentificacion = signal<TipoDocumentoIdentidad>('CC');
  protected readonly ateNumeroIdentificacion = signal('');
  protected readonly ateTelefono = signal('');
  protected readonly ateCorreo = signal('');
  protected readonly ateOcupacion = signal('');

  // --- Paso 3: datos del inmueble (Req 30.4). Preselección fiel al prototipo. ---
  protected readonly inmTipoInmueble = signal<string>(TIPOS_INMUEBLE_CONTRATO[0]);
  protected readonly inmUso = signal<string>(USOS_INMUEBLE[0]);
  protected readonly inmDireccion = signal('');
  protected readonly inmCiudad = signal('');
  protected readonly inmMatricula = signal('');
  protected readonly inmEstrato = signal<number | null>(4);
  protected readonly inmArea = signal<number | null>(null);

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
        this.estadoEnvio.set('exito');
        this.generado.emit(respuesta);
      },
      error: () => {
        this.estadoEnvio.set('inactivo');
        this.errorMensaje.set(
          'No fue posible generar el contrato. Intenta nuevamente en unos minutos.',
        );
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
    };
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
    };
    const arrendatario: DatosArrendatario = {
      nombres: this.ateNombres().trim(),
      apellidos: this.ateApellidos().trim(),
      tipoIdentificacion: this.ateTipoIdentificacion(),
      numeroIdentificacion: this.ateNumeroIdentificacion().trim(),
      telefono: this.ateTelefono().trim(),
      correo: this.ateCorreo().trim(),
      ocupacion: this.ateOcupacion().trim(),
    };
    const inmueble: DatosInmueble = {
      tipoInmueble: this.inmTipoInmueble().trim(),
      uso: this.inmUso().trim(),
      direccionCompleta: this.inmDireccion().trim(),
      ciudad: this.inmCiudad().trim(),
      matriculaInmobiliaria: this.inmMatricula().trim(),
      estrato: this.inmEstrato() as number,
      areaMetrosCuadrados: this.inmArea() as number,
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
    };
    return { arrendador, arrendatario, inmueble, condiciones };
  }
}
