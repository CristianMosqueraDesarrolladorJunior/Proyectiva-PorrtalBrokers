import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  BotonComponent,
  FormFieldComponent,
  StepTabsComponent,
  AlertBannerComponent,
  EscaleritaLoaderComponent,
  SuccessScreenComponent,
  PageHeaderComponent,
} from '../../../shared/components';
import {
  NuevoNegocioService,
  type NuevoNegocioResponse,
} from '../../../core/services/nuevo-negocio.service';
import type {
  DatosClienteNN,
  Frecuencia,
  NuevoNegocioRequest,
  ParametrosPreciosNN,
  ResumenNuevoNegocio,
} from '../../../core/models/nuevo-negocio.model';
import { validarPaso1 } from '../nuevo-negocio-validacion';
import {
  guardarBorrador,
  recuperarBorrador,
  type EstadoFormularioNN,
} from '../nuevo-negocio-borrador';

/** Etiquetas de los 3 pasos del flujo Nuevo_Negocio (Req 31.1). */
const PASOS_NUEVO_NEGOCIO: readonly string[] = [
  'Datos cliente',
  'Precios',
  'Confirmación',
];

/** Opciones de frecuencia de pago del paso 2 (Req 31.4). */
const FRECUENCIAS: readonly { readonly valor: Frecuencia; readonly etiqueta: string }[] = [
  { valor: 'mensual', etiqueta: 'Mensual' },
  { valor: 'trimestral', etiqueta: 'Trimestral' },
  { valor: 'anual', etiqueta: 'Anual' },
];

/** Estado del envío del Nuevo_Negocio para controlar loaders y confirmación (Req 31.7). */
type EstadoEnvioNN = 'inactivo' | 'enviando' | 'exito';

/**
 * NuevoNegocioComponent — Flujo Nuevo_Negocio de 3 pasos (Req 31).
 *
 * Presenta un `StepTabsComponent` de 3 pasos (Datos cliente → Precios → Confirmación).
 * El paso 1 captura los datos del cliente y valida los obligatorios con la lógica pura
 * `validarPaso1` (nombre o razón social, identificación, correo y teléfono; dirección
 * opcional) antes de permitir avanzar al paso 2 (Req 31.2, 31.3). El paso 2 captura los
 * parámetros financieros y solicita el resumen al `Motor_Precios_NN` del API_Backend
 * (`NuevoNegocioService.calcularResumen`); el front SOLO muestra el `ResumenNuevoNegocio`
 * recibido —no calcula— (Req 31.4, 31.5, 31.8). El paso 3 confirma el registro con
 * radicado, estado y prima total (Req 31.7).
 *
 * "Guardar Borrador" conserva un `BorradorNuevoNegocio` en el estado en memoria del
 * feature SIN enviar la solicitud y SIN almacenar PII ni token en
 * `localStorage`/`sessionStorage` (Req 31.9, 28.1), reutilizando la lógica pura
 * `guardarBorrador`/`recuperarBorrador`.
 *
 * El cálculo y el registro autoritativos residen en el API_Backend; esta capa valida
 * por UX y muestra los resultados recibidos.
 */
@Component({
  selector: 'app-nuevo-negocio',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    FormsModule,
    BotonComponent,
    FormFieldComponent,
    StepTabsComponent,
    AlertBannerComponent,
    EscaleritaLoaderComponent,
    SuccessScreenComponent,
    PageHeaderComponent,
  ],
  templateUrl: './nuevo-negocio.component.html',
  styleUrl: './nuevo-negocio.component.scss',
})
export class NuevoNegocioComponent {
  private readonly nuevoNegocioService = inject(NuevoNegocioService);

  /** Etiquetas de los pasos del stepper (Req 31.1). */
  protected readonly pasos = PASOS_NUEVO_NEGOCIO;

  /** Opciones de frecuencia de pago (Req 31.4). */
  protected readonly frecuencias = FRECUENCIAS;

  /** Índice del paso activo (0 = Datos cliente, 1 = Precios, 2 = Confirmación). */
  protected readonly pasoActual = signal(0);

  // --- Paso 1: datos del cliente (Req 31.2) ---
  protected readonly nombreORazonSocial = signal('');
  protected readonly identificacion = signal('');
  protected readonly correo = signal('');
  protected readonly telefono = signal('');
  protected readonly direccion = signal('');

  // --- Paso 2: parámetros de precios (Req 31.4) ---
  protected readonly primaBase = signal<number | null>(null);
  protected readonly gastosAdministrativos = signal<number | null>(null);
  protected readonly descuentoPct = signal<number | null>(null);
  protected readonly comisionPct = signal<number | null>(null);
  protected readonly frecuencia = signal<Frecuencia>('mensual');

  /** Indica si el Broker ya intentó avanzar del paso 1 (para mostrar errores). */
  protected readonly intentoAvance = signal(false);

  /** Resumen financiero recibido del Motor_Precios_NN; el front solo lo muestra (Req 31.5, 31.8). */
  protected readonly resumen = signal<ResumenNuevoNegocio | null>(null);

  /** Verdadero mientras se solicita el resumen al backend (Req 31.5). */
  protected readonly calculando = signal(false);

  /** Estado del envío final (inactivo/enviando/éxito) (Req 31.7). */
  protected readonly estadoEnvio = signal<EstadoEnvioNN>('inactivo');

  /** Confirmación del Nuevo_Negocio registrado (radicado, estado, prima total) (Req 31.7). */
  protected readonly confirmacion = signal<NuevoNegocioResponse | null>(null);

  /** Mensaje de error genérico, sin exponer detalles internos (Req 28.5). */
  protected readonly errorMensaje = signal('');

  /** Aviso de que el borrador fue guardado en el estado del feature (Req 31.9). */
  protected readonly borradorGuardado = signal(false);

  /** Borrador conservado en memoria del feature; NUNCA en localStorage (Req 31.9, 28.1). */
  private borrador: EstadoFormularioNN | null = null;

  /** Resultado de la validación pura del paso 1 (Req 31.3). */
  protected readonly validacionPaso1 = computed(() =>
    validarPaso1({
      nombreORazonSocial: this.nombreORazonSocial(),
      identificacion: this.identificacion(),
      correo: this.correo(),
      telefono: this.telefono(),
    }),
  );

  /** Verdadero si el paso 1 es válido para avanzar al paso 2 (Req 31.3). */
  protected readonly paso1Valido = computed(() => this.validacionPaso1().paso1Valido);

  /** Verdadero mientras se envía la solicitud final (Req 31.7). */
  protected readonly enviando = computed(() => this.estadoEnvio() === 'enviando');

  /** Verdadero cuando el envío finalizó con éxito (Req 31.7). */
  protected readonly envioExitoso = computed(() => this.estadoEnvio() === 'exito');

  /** Mensaje de error del campo nombre cuando corresponde mostrarlo. */
  protected readonly errorNombre = computed(() =>
    this.intentoAvance() && !this.validacionPaso1().nombreValido
      ? 'El nombre o razón social es obligatorio'
      : '',
  );

  /** Mensaje de error del campo identificación cuando corresponde mostrarlo. */
  protected readonly errorIdentificacion = computed(() =>
    this.intentoAvance() && !this.validacionPaso1().identificacionValida
      ? 'La identificación es obligatoria'
      : '',
  );

  /** Mensaje de error del campo correo cuando corresponde mostrarlo. */
  protected readonly errorCorreo = computed(() =>
    this.intentoAvance() && !this.validacionPaso1().correoValido
      ? 'El correo electrónico es obligatorio'
      : '',
  );

  /** Mensaje de error del campo teléfono cuando corresponde mostrarlo. */
  protected readonly errorTelefono = computed(() =>
    this.intentoAvance() && !this.validacionPaso1().telefonoValido
      ? 'El teléfono es obligatorio'
      : '',
  );

  /**
   * Avanza del paso 1 al paso 2 si los datos del cliente son válidos (Req 31.3).
   * Marca el intento para revelar errores de campo; si es inválido, no avanza.
   */
  protected avanzarAPrecios(): void {
    this.intentoAvance.set(true);
    this.borradorGuardado.set(false);
    if (!this.paso1Valido()) {
      return;
    }
    this.pasoActual.set(1);
  }

  /** Regresa del paso 2 al paso 1 para editar los datos del cliente. */
  /** Vuelve a Datos del cliente desde las pestañas (solo antes de confirmar). */
  protected irAPaso(indice: number): void {
    if (indice === 0 && this.pasoActual() === 1) {
      this.volverADatosCliente();
    }
  }

  protected volverADatosCliente(): void {
    this.borradorGuardado.set(false);
    this.pasoActual.set(0);
  }

  /**
   * Solicita el resumen financiero al Motor_Precios_NN del API_Backend (Req 31.5, 31.8).
   * El front NO calcula: muestra el `ResumenNuevoNegocio` recibido. Requiere que los
   * parámetros financieros estén completos.
   */
  protected calcularResumen(): void {
    this.borradorGuardado.set(false);
    this.errorMensaje.set('');
    const parametros = this.construirParametros();
    if (parametros === null) {
      this.errorMensaje.set('Completa los parámetros de precios para calcular el resumen.');
      return;
    }
    this.calculando.set(true);
    this.nuevoNegocioService.calcularResumen(parametros).subscribe({
      next: (resumen) => {
        this.resumen.set(resumen);
        this.calculando.set(false);
      },
      error: () => {
        this.calculando.set(false);
        this.errorMensaje.set('No fue posible calcular el resumen. Intenta nuevamente.');
      },
    });
  }

  /**
   * Envía la solicitud del Nuevo_Negocio y avanza a la confirmación (Req 31.7).
   * Requiere datos del cliente válidos y parámetros de precios completos.
   */
  protected enviar(): void {
    this.errorMensaje.set('');
    this.borradorGuardado.set(false);
    const request = this.construirRequest();
    if (request === null) {
      this.errorMensaje.set('Completa los datos requeridos antes de enviar la solicitud.');
      return;
    }
    this.estadoEnvio.set('enviando');
    this.nuevoNegocioService.registrar(request).subscribe({
      next: (respuesta) => {
        this.confirmacion.set(respuesta);
        this.estadoEnvio.set('exito');
        this.pasoActual.set(2);
      },
      error: () => {
        this.estadoEnvio.set('inactivo');
        this.errorMensaje.set('No fue posible registrar el nuevo negocio. Intenta nuevamente.');
      },
    });
  }

  /**
   * Guarda un borrador del Nuevo_Negocio en el estado en memoria del feature (Req 31.9).
   * NO envía la solicitud al API_Backend y NO almacena PII ni token en
   * `localStorage`/`sessionStorage` (Req 28.1). Reutiliza la lógica pura `guardarBorrador`.
   */
  protected guardarBorrador(): void {
    const estado: EstadoFormularioNN = {
      datosCliente: this.datosClienteActuales(),
      parametros: this.parametrosActuales(),
      pasoActual: this.pasoActual(),
    };
    // Se conserva en memoria del feature; NUNCA en localStorage/sessionStorage (Req 28.1).
    this.borrador = recuperarBorrador(guardarBorrador(estado, new Date().toISOString()));
    this.borradorGuardado.set(true);
  }

  /**
   * Reinicia el flujo para registrar un nuevo negocio tras una confirmación (Req 31.7).
   */
  protected nuevoNegocio(): void {
    this.nombreORazonSocial.set('');
    this.identificacion.set('');
    this.correo.set('');
    this.telefono.set('');
    this.direccion.set('');
    this.primaBase.set(null);
    this.gastosAdministrativos.set(null);
    this.descuentoPct.set(null);
    this.comisionPct.set(null);
    this.frecuencia.set('mensual');
    this.intentoAvance.set(false);
    this.resumen.set(null);
    this.confirmacion.set(null);
    this.errorMensaje.set('');
    this.borradorGuardado.set(false);
    this.borrador = null;
    this.estadoEnvio.set('inactivo');
    this.pasoActual.set(0);
  }

  /** Datos del cliente capturados como estado parcial (Req 31.2). */
  private datosClienteActuales(): Partial<DatosClienteNN> {
    return {
      nombreORazonSocial: this.nombreORazonSocial(),
      identificacion: this.identificacion(),
      correo: this.correo(),
      telefono: this.telefono(),
      direccion: this.direccion(),
    };
  }

  /** Parámetros de precios capturados como estado parcial (Req 31.4). */
  private parametrosActuales(): Partial<ParametrosPreciosNN> {
    return {
      ...(this.primaBase() !== null ? { primaBase: this.primaBase() as number } : {}),
      ...(this.gastosAdministrativos() !== null
        ? { gastosAdministrativos: this.gastosAdministrativos() as number }
        : {}),
      ...(this.descuentoPct() !== null ? { descuentoPct: this.descuentoPct() as number } : {}),
      ...(this.comisionPct() !== null ? { comisionPct: this.comisionPct() as number } : {}),
      frecuencia: this.frecuencia(),
    };
  }

  /**
   * Construye los `ParametrosPreciosNN` completos si todos los importes están presentes.
   * @returns los parámetros, o `null` si falta algún valor numérico obligatorio.
   */
  private construirParametros(): ParametrosPreciosNN | null {
    const primaBase = this.primaBase();
    const gastosAdministrativos = this.gastosAdministrativos();
    const descuentoPct = this.descuentoPct();
    const comisionPct = this.comisionPct();
    if (
      primaBase === null ||
      gastosAdministrativos === null ||
      descuentoPct === null ||
      comisionPct === null
    ) {
      return null;
    }
    return {
      primaBase,
      gastosAdministrativos,
      descuentoPct,
      comisionPct,
      frecuencia: this.frecuencia(),
    };
  }

  /**
   * Construye el `NuevoNegocioRequest` completo si los datos del cliente son válidos y
   * los parámetros de precios están completos.
   * @returns la solicitud, o `null` si falta información obligatoria.
   */
  private construirRequest(): NuevoNegocioRequest | null {
    const parametros = this.construirParametros();
    if (!this.paso1Valido() || parametros === null) {
      return null;
    }
    const datosCliente: DatosClienteNN = {
      nombreORazonSocial: this.nombreORazonSocial().trim(),
      identificacion: this.identificacion().trim(),
      correo: this.correo().trim(),
      telefono: this.telefono().trim(),
      direccion: this.direccion().trim(),
    };
    return { datosCliente, parametros };
  }
}
