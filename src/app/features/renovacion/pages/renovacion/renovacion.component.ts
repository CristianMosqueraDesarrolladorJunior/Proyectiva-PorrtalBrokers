import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  AlertBannerComponent,
  BotonComponent,
  DocUploaderComponent,
  EscaleritaLoaderComponent,
  FormFieldComponent,
  RadioGroupComponent,
  StepTabsComponent,
  SuccessScreenComponent,
} from '../../../../shared/components';
import type { ReglaDocumentoUploader } from '../../../../shared/components/doc-uploader/doc-uploader.component';
import type { OpcionRadio } from '../../../../shared/components/radio-group/radio-group.component';
import type { TarjetaSeguimiento } from '../../../../shared/components/success-screen/success-screen.component';
import type {
  DocumentoCargado,
  TipoMimePermitido,
} from '../../../../core/models/documento.model';
import type {
  ModalidadRenovacion,
  RenovacionRequest,
  ValoresReferenciaUltimoPeriodo,
} from '../../../../core/models/renovacion.model';
import type {
  TipoDocumentoIdentidad,
  TipoPersona,
} from '../../../../core/models/radicacion.model';
import { RenovacionService } from '../../../../core/services/renovacion.service';
import {
  LIMITE_TAMANO_GENERAL_BYTES,
  validarDocumento,
  type MotivoRechazoDocumento,
  type ReglaValidacionDocumento,
} from '../../../../shared/validation/documento-validacion';
import {
  DESCRIPCION_MODALIDAD_RENOVACION,
  ETIQUETA_MODALIDAD_RENOVACION,
  ETIQUETA_TIPO_DOCUMENTO,
  ETIQUETA_TIPO_PERSONA,
  MODALIDADES_RENOVACION,
  TIPOS_DOCUMENTO_IDENTIDAD,
  TIPOS_PERSONA_RENOVACION,
  avisoSarlaft,
  puedeEnviarRenovacion,
  sonDatosPropietarioValidos,
  validarDatosRenovacion,
  type DatosRenovacion,
  type ErroresRenovacion,
} from '../../renovacion-habilitacion';

import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
/** Errores por campo todos vacíos (sin mostrar), antes del primer intento. */
const ERRORES_VACIOS: ErroresRenovacion = {
  tipoPersona: '',
  tipoDocumentoPropietario: '',
  numeroDocumentoPropietario: '',
  celular: '',
  correo: '',
  direccionCorrespondencia: '',
  ciudadResidencia: '',
  numeroPoliza: '',
  fechaFinVigencia: '',
  modalidad: '',
};

/** Estado del envío de la Renovacion para controlar loaders y confirmación (Req 20, 21). */
type EstadoEnvioRenovacion = 'inactivo' | 'enviando' | 'exito';

/** Identificador del Formulario de Renovación en el uploader (Req 19.1). */
const ID_FORMULARIO_RENOVACION = 'formularioRenovacion';

/** Identificador del Formulario SARLAFT opcional en el uploader (Req 17.3). */
const ID_FORMULARIO_SARLAFT = 'formularioSarlaft';

/**
 * Pasos del flujo de Renovacion mostrados por el `StepTabsComponent` (Req 18.4).
 * Modalidad → Datos del propietario → Documentos → Confirmación.
 */
const PASOS_RENOVACION: readonly string[] = [
  'Modalidad',
  'Datos',
  'Documentos',
  'Confirmación',
];

/** Índice de cada paso del flujo, para el avance controlado (Req 18.4). */
const enum PasoRenovacion {
  Modalidad = 0,
  Datos = 1,
  Documentos = 2,
  Confirmacion = 3,
}

/**
 * Regla de validación por UX del Formulario de Renovación y del Formulario SARLAFT:
 * PDF/JPG/PNG, tamaño ≤ 10 MB, sin exigencia de vigencia (Req 19.2 → Req 13).
 * El backend revalida siempre.
 */
const REGLA_FORMULARIO_RENOVACION: ReglaValidacionDocumento = {
  mimePermitidos: ['application/pdf', 'image/jpeg', 'image/png'],
  tamanoMaxBytes: LIMITE_TAMANO_GENERAL_BYTES,
  vigenciaMaxDias: null,
};

/** Mensajes de rechazo del documento por motivo tipado (Req 19.2). */
const MENSAJE_RECHAZO: Readonly<Record<MotivoRechazoDocumento, string>> = {
  mime_no_permitido: 'El documento debe estar en formato PDF, JPG o PNG.',
  extension_no_permitida: 'El documento debe estar en formato PDF, JPG o PNG.',
  tamano_excedido: 'El documento supera el tamaño máximo permitido de 10 MB.',
  vigencia_requerida: 'El documento no cumple con la vigencia requerida.',
  vigencia_invalida: 'La fecha del documento no es válida.',
  vigencia_excedida: 'El documento supera la vigencia permitida.',
};

/**
 * RenovacionComponent — Detalle de póliza, modalidad y formulario de Renovación
 * (Req 17, 18, 19, 20, 21).
 *
 * Guía al Broker por el flujo de Renovacion en pasos, REUTILIZANDO sin duplicar los
 * Componentes_Compartidos `StepTabsComponent` (avance, Req 18.4), `RadioGroupComponent`
 * (tipo de persona, tipo de documento y modalidad, Req 17.1, 17.2, 18.2, 18.3),
 * `FormFieldComponent`, `DocUploaderComponent` (Formulario de Renovación obligatorio
 * y Formulario SARLAFT opcional, Req 17.3, 19.1), `AlertBannerComponent`
 * (`AvisoSarlaftEnlaceDigital`, Req 17.5), `EscaleritaLoaderComponent`,
 * `SuccessScreenComponent` (Req 21) y `BotonComponent`.
 *
 * Al abrir el detalle se muestran los `ValoresReferenciaUltimoPeriodo` del último
 * periodo facturado (Req 18.1). La captura del `RenovacionRequest` (documento del
 * propietario, celular, correo, dirección de correspondencia, ciudad de residencia,
 * número de póliza y fecha de finalización de vigencia) y la habilitación de cada
 * paso/envío se deciden con la lógica pura `sonDatosPropietarioValidos` /
 * `puedeEnviarRenovacion` (Property 28). El Formulario SARLAFT es opcional y su
 * ausencia activa el `AvisoSarlaftEnlaceDigital` (Req 17.5). La confirmación de
 * identidad exige aceptación explícita (Req 20).
 *
 * Al confirmar, `RenovacionService` registra la Renovacion en el API_Backend
 * (`POST /api/v1/renovaciones`) y se confirma con `SuccessScreenComponent` (Req 21).
 * El backend revalida siempre; no hay lógica autoritativa en el frontend.
 */
@Component({
  selector: 'app-renovacion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, 
    CurrencyPipe,
    FormsModule,
    StepTabsComponent,
    RadioGroupComponent,
    FormFieldComponent,
    DocUploaderComponent,
    AlertBannerComponent,
    EscaleritaLoaderComponent,
    SuccessScreenComponent,
    BotonComponent,
  ],
  templateUrl: './renovacion.component.html',
  styleUrl: './renovacion.component.scss',
})
export class RenovacionComponent {
  private readonly renovacionService = inject(RenovacionService);
  private readonly router = inject(Router);

  /**
   * Valores de referencia del último periodo facturado mostrados en el detalle de
   * la póliza (Req 18.1). El contenedor los provee al iniciar la Renovacion.
   */
  @Input() valoresReferencia: ValoresReferenciaUltimoPeriodo | null = null;

  /** Número de póliza a renovar; prefija el campo cuando llega del contexto (Req 17.4). */
  @Input() set numeroPolizaInicial(valor: string) {
    if (valor.trim().length > 0) {
      this.numeroPoliza.set(valor);
    }
  }

  /** Emite al finalizar el flujo para regresar a Renovaciones o Seguimiento (Req 21.3). */
  @Output() readonly volver = new EventEmitter<void>();

  /** Etiquetas de los pasos del flujo para el `StepTabsComponent` (Req 18.4). */
  protected readonly pasos = PASOS_RENOVACION;

  /** Paso activo del flujo (0-indexado) (Req 18.4). */
  protected readonly pasoActivo = signal<PasoRenovacion>(PasoRenovacion.Modalidad);

  // --- Modalidad y tipo de persona (Req 17.1, 18.2, 18.3) ---

  /** Opciones de tipo de persona presentadas como tarjetas (Req 17.1). */
  protected readonly opcionesTipoPersona: readonly OpcionRadio[] =
    TIPOS_PERSONA_RENOVACION.map((tipo) => ({
      valor: tipo,
      etiqueta: ETIQUETA_TIPO_PERSONA[tipo],
    }));

  /** Opciones de tipo de documento del propietario presentadas como tarjetas (Req 17.2). */
  protected readonly opcionesTipoDocumento: readonly OpcionRadio[] =
    TIPOS_DOCUMENTO_IDENTIDAD.map((tipo) => ({
      valor: tipo,
      etiqueta: ETIQUETA_TIPO_DOCUMENTO[tipo],
    }));

  /** Opciones de modalidad de renovación con su descripción (Req 18.2, 18.3). */
  protected readonly opcionesModalidad: readonly OpcionRadio[] =
    MODALIDADES_RENOVACION.map((modalidad) => ({
      valor: modalidad,
      etiqueta: ETIQUETA_MODALIDAD_RENOVACION[modalidad],
      descripcion: DESCRIPCION_MODALIDAD_RENOVACION[modalidad],
    }));

  // --- Estado capturado del propietario y de la póliza (Req 17.1, 17.2, 17.4) ---

  protected readonly tipoPersona = signal('');
  protected readonly modalidad = signal('');
  protected readonly tipoDocumentoPropietario = signal('');
  protected readonly numeroDocumentoPropietario = signal('');
  protected readonly celular = signal('');
  protected readonly correo = signal('');
  protected readonly direccionCorrespondencia = signal('');
  protected readonly ciudadResidencia = signal('');
  protected readonly numeroPoliza = signal('');
  protected readonly fechaFinVigencia = signal('');
  protected readonly comentarios = signal('');

  /** Formulario de Renovación cargado y validado (obligatorio) (Req 17.3, 19.1). */
  protected readonly formularioRenovacion = signal<DocumentoCargado | undefined>(undefined);

  /** Formulario SARLAFT cargado y validado (opcional) (Req 17.3, 17.5). */
  protected readonly formularioSarlaft = signal<DocumentoCargado | undefined>(undefined);

  /** Aceptación explícita de la confirmación de identidad (Req 20.1, 20.2). */
  protected readonly aceptacionExplicita = signal(false);

  // --- Errores de validación por UX ---

  protected readonly errorFormularioRenovacion = signal('');
  protected readonly errorFormularioSarlaft = signal('');
  protected readonly intentoAvanceDatos = signal(false);
  protected readonly intentoConfirmar = signal(false);

  // --- Estado del envío (Req 20.3, 20.4, 21) ---

  protected readonly estadoEnvio = signal<EstadoEnvioRenovacion>('inactivo');
  protected readonly errorEnvio = signal('');
  protected readonly radicado = signal('');
  protected readonly estadoTramite = signal('');

  /** Reglas de presentación del Formulario de Renovación en el uploader (Req 19.1). */
  protected readonly reglasFormularioRenovacion: readonly ReglaDocumentoUploader[] = [
    {
      id: ID_FORMULARIO_RENOVACION,
      etiqueta: 'Formulario de Renovación',
      descripcion: 'Obligatorio · PDF, JPG o PNG (Máx 10MB)',
      icono: '📄',
      obligatorio: true,
    },
  ];

  /** Reglas de presentación del Formulario SARLAFT (opcional) en el uploader (Req 17.3). */
  protected readonly reglasFormularioSarlaft: readonly ReglaDocumentoUploader[] = [
    {
      id: ID_FORMULARIO_SARLAFT,
      etiqueta: 'Formulario SARLAFT',
      descripcion: 'Opcional · PDF, JPG o PNG (Máx 10MB)',
      icono: '📑',
      obligatorio: false,
    },
  ];

  /** Nombre del archivo del Formulario de Renovación cargado, para el uploader. */
  protected readonly cargadosRenovacion = computed<Readonly<Record<string, string>>>(() => {
    const doc = this.formularioRenovacion();
    const registro: Record<string, string> = {};
    if (doc) {
      registro[ID_FORMULARIO_RENOVACION] = doc.nombre;
    }
    return registro;
  });

  /** Nombre del archivo del Formulario SARLAFT cargado, para el uploader. */
  protected readonly cargadosSarlaft = computed<Readonly<Record<string, string>>>(() => {
    const doc = this.formularioSarlaft();
    const registro: Record<string, string> = {};
    if (doc) {
      registro[ID_FORMULARIO_SARLAFT] = doc.nombre;
    }
    return registro;
  });

  /**
   * Datos agregados del propietario y de la póliza en la forma que consume la
   * lógica pura de habilitación (Property 28).
   */
  private readonly datos = computed<DatosRenovacion>(() => ({
    tipoPersona: this.tipoPersona(),
    tipoDocumentoPropietario: this.tipoDocumentoPropietario(),
    numeroDocumentoPropietario: this.numeroDocumentoPropietario(),
    celular: this.celular(),
    correo: this.correo(),
    direccionCorrespondencia: this.direccionCorrespondencia(),
    ciudadResidencia: this.ciudadResidencia(),
    numeroPoliza: this.numeroPoliza(),
    fechaFinVigencia: this.fechaFinVigencia(),
    modalidad: this.modalidad(),
    formularioRenovacion: this.formularioRenovacion(),
    aceptacionExplicita: this.aceptacionExplicita(),
  }));

  /** Verdadero cuando ya se eligieron tipo de persona y modalidad (Req 17.1, 18.2, 18.3). */
  protected readonly modalidadSeleccionada = computed(
    () =>
      (TIPOS_PERSONA_RENOVACION as readonly string[]).includes(this.tipoPersona()) &&
      (MODALIDADES_RENOVACION as readonly string[]).includes(this.modalidad()),
  );

  /** Verdadero cuando los datos obligatorios del propietario y póliza son válidos (Req 17.2, 17.4). */
  protected readonly datosValidos = computed(() =>
    sonDatosPropietarioValidos(this.datos()),
  );

  /**
   * Errores específicos por campo (Req 17.2, 17.4). Solo se revelan tras intentar
   * avanzar (`intentoAvanceDatos`), para no molestar antes de la primera acción.
   */
  protected readonly errores = computed(() =>
    this.intentoAvanceDatos()
      ? validarDatosRenovacion(this.datos())
      : ERRORES_VACIOS,
  );

  /** Lista de mensajes de error activos, para el resumen del banner (Req 17.2). */
  protected readonly listaErrores = computed<readonly string[]>(() =>
    Object.values(this.errores()).filter((mensaje) => mensaje.length > 0),
  );

  /** Aviso de envío del Formulario SARLAFT por enlace digital (Req 17.5). */
  protected readonly aviso = computed(() => avisoSarlaft(this.formularioSarlaft()));

  /** Verdadero si la Renovacion puede enviarse (datos + formulario + aceptación) (Req 20). */
  protected readonly envioHabilitado = computed(() =>
    puedeEnviarRenovacion(this.datos()),
  );

  /** Verdadero mientras se envía la Renovacion (bloquea el botón, Req 20.3). */
  protected readonly enviando = computed(() => this.estadoEnvio() === 'enviando');

  /** Verdadero cuando el envío finalizó con éxito (muestra confirmación, Req 21). */
  protected readonly envioExitoso = computed(() => this.estadoEnvio() === 'exito');

  /** Mensaje de error de aceptación cuando se intenta confirmar sin aceptar (Req 20.2). */
  protected readonly errorAceptacion = computed(() =>
    this.intentoConfirmar() && !this.aceptacionExplicita()
      ? 'Debes aceptar para autorizar la renovación en nombre del broker autenticado'
      : '',
  );

  /** Tarjetas de seguimiento de la pantalla de éxito (radicado y estado) (Req 21.1). */
  protected readonly tarjetas = computed<readonly TarjetaSeguimiento[]>(() => [
    { etiqueta: 'RADICADO', valor: this.radicado() },
    { etiqueta: 'ESTADO', valor: this.estadoTramite() },
    { etiqueta: 'MODALIDAD', valor: this.etiquetaModalidad() },
  ]);

  /** Etiqueta legible de la modalidad seleccionada para el resumen. */
  protected etiquetaModalidad(): string {
    const modalidad = this.modalidad();
    return (MODALIDADES_RENOVACION as readonly string[]).includes(modalidad)
      ? ETIQUETA_MODALIDAD_RENOVACION[modalidad as ModalidadRenovacion]
      : '';
  }

  /** Etiqueta legible del tipo de persona seleccionado para el resumen. */
  protected etiquetaTipoPersona(): string {
    const tipo = this.tipoPersona();
    return (TIPOS_PERSONA_RENOVACION as readonly string[]).includes(tipo)
      ? ETIQUETA_TIPO_PERSONA[tipo as TipoPersona]
      : '';
  }

  /** Continúa desde la modalidad al paso de datos del propietario (Req 18.2, 18.3). */
  protected continuarDesdeModalidad(): void {
    if (this.modalidadSeleccionada()) {
      this.pasoActivo.set(PasoRenovacion.Datos);
    }
  }

  /** Continúa desde los datos del propietario al paso de documentos (Req 17.2, 17.4). */
  protected continuarDesdeDatos(): void {
    this.intentoAvanceDatos.set(true);
    if (this.datosValidos()) {
      this.pasoActivo.set(PasoRenovacion.Documentos);
    }
  }

  /**
   * Continúa desde los documentos al paso de confirmación de identidad (Req 19.4).
   * Requiere el Formulario de Renovación obligatorio; el SARLAFT es opcional.
   */
  protected continuarDesdeDocumentos(): void {
    if (this.formularioRenovacion() !== undefined) {
      this.pasoActivo.set(PasoRenovacion.Confirmacion);
    }
  }

  /** Vuelve a un paso ya completado desde las pestañas, sin perder datos. */
  protected irAPaso(indice: number): void {
    if (indice >= 0 && indice < this.pasoActivo()) {
      this.pasoActivo.set(indice);
    }
  }

  /** Regresa al paso anterior del flujo sin perder los datos capturados. */
  protected retroceder(): void {
    const actual = this.pasoActivo();
    if (actual > PasoRenovacion.Modalidad) {
      this.pasoActivo.set(actual - 1);
    }
  }

  /**
   * Procesa la selección del Formulario de Renovación, validándolo por UX
   * (Req 19.2). Si es válido lo conserva; si no, muestra el motivo de rechazo.
   */
  protected onFormularioRenovacion(archivo: File): void {
    this.errorFormularioRenovacion.set('');
    const resultado = this.validar(archivo);
    if (resultado.documento === undefined) {
      this.formularioRenovacion.set(undefined);
      this.errorFormularioRenovacion.set(resultado.mensaje);
      return;
    }
    this.formularioRenovacion.set(resultado.documento);
  }

  /**
   * Procesa la selección del Formulario SARLAFT opcional, validándolo por UX
   * (Req 17.3, 19.2). Si es válido lo conserva; si no, muestra el motivo de rechazo.
   */
  protected onFormularioSarlaft(archivo: File): void {
    this.errorFormularioSarlaft.set('');
    const resultado = this.validar(archivo);
    if (resultado.documento === undefined) {
      this.formularioSarlaft.set(undefined);
      this.errorFormularioSarlaft.set(resultado.mensaje);
      return;
    }
    this.formularioSarlaft.set(resultado.documento);
  }

  /**
   * Valida un archivo cargado con la lógica pura `validarDocumento` (Req 19.2).
   * @param archivo Archivo nativo seleccionado.
   * @returns Documento válido o mensaje de rechazo.
   */
  private validar(archivo: File): {
    readonly documento?: DocumentoCargado;
    readonly mensaje: string;
  } {
    const documento: DocumentoCargado = {
      nombre: archivo.name,
      tipoMime: archivo.type as TipoMimePermitido,
      tamanoBytes: archivo.size,
    };
    const resultado = validarDocumento(documento, REGLA_FORMULARIO_RENOVACION, '');
    if (!resultado.valido) {
      return { mensaje: MENSAJE_RECHAZO[resultado.motivo ?? 'mime_no_permitido'] };
    }
    return { documento, mensaje: '' };
  }

  /**
   * Confirma y registra la Renovacion si es válida (Req 20.2, 20.3, 20.4, 21).
   * Marca el intento para revelar el error de aceptación; si el envío no está
   * habilitado no realiza la solicitud. Al registrarse correctamente muestra la
   * pantalla de éxito; ante un fallo muestra un mensaje genérico y ofrece Soporte.
   */
  protected confirmar(): void {
    this.intentoConfirmar.set(true);
    this.errorEnvio.set('');
    const formularioRenovacion = this.formularioRenovacion();
    if (!this.envioHabilitado() || formularioRenovacion === undefined) {
      return;
    }

    const comentarios = this.comentarios().trim();
    const formularioSarlaft = this.formularioSarlaft();
    const request: RenovacionRequest = {
      tipoPersona: this.tipoPersona() as TipoPersona,
      tipoDocumentoPropietario: this.tipoDocumentoPropietario() as TipoDocumentoIdentidad,
      numeroDocumentoPropietario: this.numeroDocumentoPropietario().trim(),
      celular: this.celular().trim(),
      correo: this.correo().trim(),
      direccionCorrespondencia: this.direccionCorrespondencia().trim(),
      ciudadResidencia: this.ciudadResidencia().trim(),
      numeroPoliza: this.numeroPoliza().trim(),
      fechaFinVigencia: this.fechaFinVigencia(),
      modalidad: this.modalidad() as ModalidadRenovacion,
      formularioRenovacion,
      aceptacionExplicita: this.aceptacionExplicita(),
      ...(formularioSarlaft ? { formularioSarlaft } : {}),
      ...(comentarios.length > 0 ? { comentarios } : {}),
    };

    this.estadoEnvio.set('enviando');
    this.renovacionService.renovar(request).subscribe({
      next: (respuesta) => {
        this.radicado.set(respuesta.radicado);
        this.estadoTramite.set(respuesta.estado);
        this.estadoEnvio.set('exito');
      },
      error: () => {
        this.estadoEnvio.set('inactivo');
        this.errorEnvio.set(
          'No fue posible registrar la renovación. Intenta nuevamente o contacta a Soporte.',
        );
      },
    });
  }

  /** Regresa a la Gestión de Renovaciones (Req 21.3). */
  protected onVolver(): void {
    this.volver.emit();
    void this.router.navigate(['/app/renovaciones']);
  }
}
