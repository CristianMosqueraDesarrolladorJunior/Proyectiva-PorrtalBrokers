import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';

import {
  AlertBannerComponent,
  BotonComponent,
  DocUploaderComponent,
  EscaleritaLoaderComponent,
  FormFieldComponent,
  ResultadoSarlaftTableComponent,
  SuccessScreenComponent,
} from '../../../../shared/components';
import type {
  ArchivoSeleccionado,
  ReglaDocumentoUploader,
} from '../../../../shared/components/doc-uploader/doc-uploader.component';
import type { VarianteAlerta } from '../../../../shared/components/alert-banner/alert-banner.component';
import {
  AuthService,
  type ConsultaSarlaftRequest,
} from '../../../../core/services/auth.service';
import {
  DOCUMENTOS_REGISTRO_BROKER,
  type DocumentoRegistro,
  type NivelSarlaft,
  type ReglaDocumentoRegistro,
  type ResultadoSarlaft,
  type SolicitudRegistroBroker,
  type TipoDocumentoRegistro,
} from '../../../../core/models/registro-broker.model';
import type { TipoMimePermitido } from '../../../../core/models/documento.model';
import {
  reglaDeDocumentoRegistro,
  validarDocumento,
} from '../../../../shared/validation/documento-validacion';
import {
  CIUDADES_PERMITIDAS,
  CODIGOS_PAIS_PERMITIDOS,
  CODIGO_PAIS_DEFECTO,
  DOCUMENTO_LONGITUD_MAX,
  DOCUMENTO_LONGITUD_MIN,
  NOMBRE_LONGITUD_MIN,
  TELEFONO_LONGITUD_MAX,
  TELEFONO_LONGITUD_MIN,
  esCiudadValida,
  esCodigoPaisValido,
  esCorreoValido,
  esDocumentoValido,
  esFechaExpedicionValida,
  esNombreValido,
  esTelefonoValido,
  validarFormularioSarlaft,
  validarInformacionPersonal,
} from './registro-validacion';
import {
  clasificarSarlaft,
  puedeConsultarSarlaft,
  type ClasificacionSarlaft,
} from './sarlaft-clasificacion';
import {
  documentosRegistroCompletos,
  puedeEnviarSolicitud,
} from './registro-envio';

/** Ruta de la pantalla de login (acceso "Ya tengo cuenta") (Req 2.3). */
const RUTA_LOGIN = '/login';

/** Texto legal mostrado junto al botón de envío (Req 3.20). */
const TEXTO_LEGAL =
  'Al enviar, aceptas nuestras Políticas de Privacidad y Términos de Uso.';

/** Estado de un documento de registro cargado en memoria (nombre + validez + tipo MIME). */
interface EstadoDocumento {
  readonly nombre: string;
  readonly tamanoBytes: number;
  readonly tipoMime: TipoMimePermitido;
  readonly fechaEmision?: string;
  readonly valido: boolean;
  readonly error?: string;
}

/** Tipado del formulario reactivo de Información Personal + SARLAFT. */
interface FormularioRegistro {
  readonly nombreCompleto: FormControl<string>;
  readonly correo: FormControl<string>;
  readonly codigoPais: FormControl<string>;
  readonly telefono: FormControl<string>;
  readonly ciudad: FormControl<string>;
  readonly documento: FormControl<string>;
  readonly fechaExpedicion: FormControl<string>;
}

/**
 * Página del formulario de Solicitud_Registro_Broker (`/registro-broker`)
 * (Req 3, 2.3).
 *
 * Reutiliza los Componentes_Compartidos `FormFieldComponent`, `BotonComponent`,
 * `DocUploaderComponent`, `AlertBannerComponent`, `EscaleritaLoaderComponent`,
 * `ResultadoSarlaftTableComponent` y `SuccessScreenComponent` (sin duplicar
 * marcado, Req 35.22) y delega la validación de cliente en la lógica pura de
 * `registro-validacion.ts`, `sarlaft-clasificacion.ts`, `registro-envio.ts` y
 * `documento-validacion.ts`.
 *
 * Estructura en tres secciones (Req 3.1, 3.6, 3.16):
 *  1. Información Personal (nombre, correo, teléfono con código de país, ciudad).
 *  2. Consulta SARLAFT (documento, fecha de expedición) con clasificación por
 *     antigüedad y botón "Consultar".
 *  3. Documentación Requerida (los 4 documentos obligatorios), visible solo tras
 *     una Consulta_SARLAFT exitosa.
 *
 * El backend revalida SIEMPRE (Req 3.23); esta validación es únicamente por UX.
 * El token de sesión no aplica aquí; la solicitud queda pendiente (Req 3.25).
 */
@Component({
  selector: 'app-registro-broker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    FormFieldComponent,
    BotonComponent,
    DocUploaderComponent,
    AlertBannerComponent,
    EscaleritaLoaderComponent,
    ResultadoSarlaftTableComponent,
    SuccessScreenComponent,
  ],
  templateUrl: './registro-broker.component.html',
  styleUrl: './registro-broker.component.scss',
})
export class RegistroBrokerComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** Constantes expuestas al template. */
  protected readonly nombreLongitudMin = NOMBRE_LONGITUD_MIN;
  protected readonly telefonoLongitudMin = TELEFONO_LONGITUD_MIN;
  protected readonly telefonoLongitudMax = TELEFONO_LONGITUD_MAX;
  protected readonly documentoLongitudMin = DOCUMENTO_LONGITUD_MIN;
  protected readonly documentoLongitudMax = DOCUMENTO_LONGITUD_MAX;
  protected readonly codigosPais = CODIGOS_PAIS_PERMITIDOS;
  protected readonly ciudades = CIUDADES_PERMITIDAS;
  protected readonly textoLegal = TEXTO_LEGAL;

  /** Reglas de los 4 documentos obligatorios adaptadas al uploader (Req 3.16). */
  protected readonly reglasUploader: readonly ReglaDocumentoUploader[] =
    DOCUMENTOS_REGISTRO_BROKER.map((regla) => ({
      id: regla.tipo,
      etiqueta: regla.etiqueta,
      descripcion: regla.descripcion,
      obligatorio: true,
    }));

  /** Formulario reactivo de Información Personal + SARLAFT. */
  protected readonly formulario = new FormGroup<FormularioRegistro>({
    nombreCompleto: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    correo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    codigoPais: new FormControl(CODIGO_PAIS_DEFECTO, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    telefono: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    ciudad: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    documento: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    fechaExpedicion: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  /** Signal que refleja los valores del formulario para recomputar validaciones. */
  private readonly valores = signal(this.formulario.getRawValue());

  /** Documentos cargados en memoria, indexados por tipo (Req 3.16). */
  private readonly documentos = signal<
    Partial<Record<TipoDocumentoRegistro, EstadoDocumento>>
  >({});

  /** Resultado de la Consulta_SARLAFT exitosa; `null` mientras no se ha consultado (Req 3.15). */
  protected readonly resultadoSarlaft = signal<ResultadoSarlaft | null>(null);

  /** Indica que la Consulta_SARLAFT está en proceso (loader) (Req 3.14). */
  protected readonly consultandoSarlaft = signal(false);

  /** Indica que la Solicitud_Registro_Broker se está enviando (loader) (Req 3.21). */
  protected readonly enviando = signal(false);

  /** Mensaje de error genérico de la Consulta_SARLAFT (sin trazas ni PII). */
  protected readonly errorSarlaft = signal('');

  /** Mensaje de error genérico del envío de la solicitud (sin trazas ni PII). */
  protected readonly errorEnvio = signal('');

  /** Muestra la pantalla de éxito (modal) tras el registro exitoso (Req 3.24). */
  protected readonly registroExitoso = signal(false);

  constructor() {
    this.formulario.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.valores.set(this.formulario.getRawValue());
        // Un cambio en documento o fecha invalida una consulta SARLAFT previa.
        if (this.resultadoSarlaft() !== null) {
          this.resultadoSarlaft.set(null);
          this.documentos.set({});
        }
      });
  }

  /** Validez de la sección Información Personal (Req 3.2–3.5). */
  protected readonly personalValido = computed(() => {
    const v = this.valores();
    return validarInformacionPersonal({
      nombreCompleto: v.nombreCompleto,
      correo: v.correo,
      codigoPais: v.codigoPais,
      telefono: v.telefono,
      ciudad: v.ciudad,
    }).personalValido;
  });

  /** Validez del formulario SARLAFT (documento + fecha) (Req 3.7, 3.8). */
  protected readonly sarlaftFormValido = computed(() => {
    const v = this.valores();
    return validarFormularioSarlaft(v.documento, v.fechaExpedicion)
      .sarlaftFormValido;
  });

  /** Clasificación SARLAFT por antigüedad de la fecha de expedición (Req 3.9–3.11). */
  protected readonly clasificacionSarlaft = computed<ClasificacionSarlaft | null>(
    () => {
      const v = this.valores();
      if (!esFechaExpedicionValida(v.fechaExpedicion)) {
        return null;
      }
      return clasificarSarlaft(v.fechaExpedicion, this.hoyIso());
    },
  );

  /** Variante del banner de alerta SARLAFT según el nivel de clasificación. */
  protected readonly varianteAlertaSarlaft = computed<VarianteAlerta>(() => {
    const clasificacion = this.clasificacionSarlaft();
    return this.nivelAVariante(clasificacion?.nivel);
  });

  /** Habilitación del botón "Consultar" (Req 3.12, 3.13). */
  protected readonly puedeConsultar = computed(() =>
    puedeConsultarSarlaft(this.sarlaftFormValido(), this.clasificacionSarlaft()),
  );

  /** Nombres de los documentos cargados para el uploader (Req 3.16). */
  protected readonly cargados = computed<Readonly<Record<string, string>>>(() => {
    const estado = this.documentos();
    const salida: Record<string, string> = {};
    for (const tipo of Object.keys(estado) as TipoDocumentoRegistro[]) {
      const doc = estado[tipo];
      if (doc?.valido) {
        salida[tipo] = doc.nombre;
      }
    }
    return salida;
  });

  /** Tipos de documento cargados y validados con éxito (Req 3.16, 3.19). */
  private readonly tiposDocumentosValidos = computed<TipoDocumentoRegistro[]>(
    () => {
      const estado = this.documentos();
      return (Object.keys(estado) as TipoDocumentoRegistro[]).filter(
        (tipo) => estado[tipo]?.valido === true,
      );
    },
  );

  /** Verdadero si los 4 documentos obligatorios están cargados y válidos (Req 3.16). */
  protected readonly documentosCompletos = computed(() =>
    documentosRegistroCompletos(this.tiposDocumentosValidos()),
  );

  /** Habilitación del botón "Enviar solicitud de registro" (Req 3.19). */
  protected readonly puedeEnviar = computed(() =>
    puedeEnviarSolicitud(
      this.personalValido(),
      this.resultadoSarlaft() !== null,
      this.tiposDocumentosValidos(),
    ),
  );

  /** Mensajes de error por campo (solo tras interacción del usuario). */
  protected get errorNombre(): string {
    return this.mensajeError(
      'nombreCompleto',
      esNombreValido(this.valores().nombreCompleto),
      `El nombre es obligatorio y debe tener al menos ${NOMBRE_LONGITUD_MIN} caracteres.`,
    );
  }

  protected get errorCorreo(): string {
    return this.mensajeError(
      'correo',
      esCorreoValido(this.valores().correo),
      'Ingresa un correo electrónico válido.',
    );
  }

  protected get errorTelefono(): string {
    return this.mensajeError(
      'telefono',
      esTelefonoValido(this.valores().telefono),
      `El teléfono debe contener entre ${TELEFONO_LONGITUD_MIN} y ${TELEFONO_LONGITUD_MAX} dígitos.`,
    );
  }

  protected get errorCiudad(): string {
    return this.mensajeError(
      'ciudad',
      esCiudadValida(this.valores().ciudad),
      'Selecciona una ciudad de la lista.',
    );
  }

  protected get errorCodigoPais(): string {
    return this.mensajeError(
      'codigoPais',
      esCodigoPaisValido(this.valores().codigoPais),
      'Selecciona un código de país válido.',
    );
  }

  protected get errorDocumento(): string {
    return this.mensajeError(
      'documento',
      esDocumentoValido(this.valores().documento),
      `El documento debe contener entre ${DOCUMENTO_LONGITUD_MIN} y ${DOCUMENTO_LONGITUD_MAX} dígitos.`,
    );
  }

  protected get errorFechaExpedicion(): string {
    return this.mensajeError(
      'fechaExpedicion',
      esFechaExpedicionValida(this.valores().fechaExpedicion),
      'La fecha de expedición es obligatoria.',
    );
  }

  /**
   * Ejecuta la Consulta_SARLAFT contra el backend (Req 3.14, 3.15).
   *
   * Impide la consulta si el formulario es inválido o la antigüedad es ≥ 3 años
   * (Req 3.13). Muestra el loader mientras está en proceso y, al éxito, publica
   * el `ResultadoSarlaft` que habilita la sección Documentación Requerida.
   */
  protected consultarSarlaft(): void {
    this.errorSarlaft.set('');
    if (!this.puedeConsultar() || this.consultandoSarlaft()) {
      return;
    }
    const v = this.valores();
    const request: ConsultaSarlaftRequest = {
      documento: v.documento,
      fechaExpedicion: v.fechaExpedicion,
    };
    this.consultandoSarlaft.set(true);
    this.auth
      .consultarSarlaft(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resultado) => {
          this.consultandoSarlaft.set(false);
          this.resultadoSarlaft.set(resultado);
        },
        error: () => {
          this.consultandoSarlaft.set(false);
          this.errorSarlaft.set(
            'No fue posible completar la Consulta SARLAFT. Intenta de nuevo.',
          );
        },
      });
  }

  /**
   * Procesa la selección de un archivo para un documento de registro (Req 3.16–3.18).
   *
   * Valida MIME/extensión, tamaño y vigencia con la lógica pura de
   * `documento-validacion.ts`; almacena el estado (válido o con error) para que
   * el uploader muestre el nombre y el envío se habilite solo con los 4 válidos.
   */
  protected onArchivoSeleccionado(evento: ArchivoSeleccionado): void {
    const tipo = evento.id as TipoDocumentoRegistro;
    const regla = DOCUMENTOS_REGISTRO_BROKER.find((r) => r.tipo === tipo);
    if (regla === undefined) {
      return;
    }
    const tipoMime = evento.archivo.type as TipoMimePermitido;
    const documentoCargado = {
      nombre: evento.archivo.name,
      tipoMime,
      tamanoBytes: evento.archivo.size,
      fechaEmision:
        regla.vigenciaMaxDias !== null
          ? this.fechaEmisionArchivo(evento.archivo)
          : undefined,
    };
    const resultado = validarDocumento(
      documentoCargado,
      reglaDeDocumentoRegistro(regla),
      this.hoyIso(),
    );
    this.documentos.update((estado) => ({
      ...estado,
      [tipo]: {
        nombre: evento.archivo.name,
        tamanoBytes: evento.archivo.size,
        tipoMime,
        fechaEmision: documentoCargado.fechaEmision,
        valido: resultado.valido,
        error: resultado.valido
          ? undefined
          : this.mensajeRechazo(regla, resultado.motivo),
      },
    }));
  }

  /** Mensaje de error de validación de un documento, si existe (Req 3.18). */
  protected errorDocumentoCargado(tipo: string): string {
    return this.documentos()[tipo as TipoDocumentoRegistro]?.error ?? '';
  }

  /**
   * Envía la Solicitud_Registro_Broker al backend (Req 3.21, 3.22, 3.24).
   *
   * Valida en cliente (fail-fast) antes de enviar; muestra el loader "Enviando
   * solicitud..." y, al éxito, la pantalla de confirmación (Req 3.24). No expone
   * PII ni trazas en los mensajes de error (Req 3.26).
   */
  protected enviarSolicitud(): void {
    this.errorEnvio.set('');
    if (!this.puedeEnviar() || this.enviando()) {
      this.formulario.markAllAsTouched();
      return;
    }
    const solicitud = this.construirSolicitud();
    if (solicitud === null) {
      return;
    }
    this.enviando.set(true);
    this.auth
      .registrarSolicitud(solicitud)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.registroExitoso.set(true);
        },
        error: () => {
          this.enviando.set(false);
          this.errorEnvio.set(
            'No fue posible enviar la solicitud. Intenta de nuevo.',
          );
        },
      });
  }

  /** Navega a la pantalla de login ("Ya tengo cuenta") (Req 2.3). */
  protected irALogin(): void {
    void this.router.navigate([RUTA_LOGIN]);
  }

  /** Acción "Volver" de la pantalla de éxito: regresa al login (Req 3.24). */
  protected volverAlLogin(): void {
    this.irALogin();
  }

  /** Construye el payload tipado de la solicitud a partir del estado válido. */
  private construirSolicitud(): SolicitudRegistroBroker | null {
    const v = this.valores();
    const estado = this.documentos();
    const documentos: DocumentoRegistro[] = [];
    for (const regla of DOCUMENTOS_REGISTRO_BROKER) {
      const doc = estado[regla.tipo];
      if (doc === undefined || !doc.valido) {
        return null;
      }
      documentos.push({
        tipo: regla.tipo,
        nombre: doc.nombre,
        tipoMime: doc.tipoMime,
        tamanoBytes: doc.tamanoBytes,
        fechaEmision: doc.fechaEmision,
      });
    }
    return {
      nombreCompleto: v.nombreCompleto.trim(),
      correo: v.correo.trim(),
      codigoPais: v.codigoPais,
      telefono: v.telefono,
      ciudad: v.ciudad,
      documento: v.documento,
      fechaExpedicion: v.fechaExpedicion,
      documentos,
    };
  }

  /** Fecha de emisión del archivo (a partir de `lastModified`), en formato ISO. */
  private fechaEmisionArchivo(archivo: File): string {
    return new Date(archivo.lastModified).toISOString();
  }

  /** Fecha de referencia ("hoy") como ISO-8601 para cálculos de vigencia/antigüedad. */
  private hoyIso(): string {
    return new Date().toISOString();
  }

  /** Convierte un nivel SARLAFT a la variante del banner de alerta compartido. */
  private nivelAVariante(nivel: NivelSarlaft | undefined): VarianteAlerta {
    if (nivel === 'exito') {
      return 'success';
    }
    if (nivel === 'advertencia') {
      return 'warning';
    }
    return 'error';
  }

  /** Genera un mensaje de error de campo solo tras interacción del usuario. */
  private mensajeError(
    control: keyof FormularioRegistro,
    valido: boolean,
    mensaje: string,
  ): string {
    const ctrl = this.formulario.controls[control];
    if (!ctrl.touched && !ctrl.dirty) {
      return '';
    }
    return valido ? '' : mensaje;
  }

  /** Traduce el motivo de rechazo de un documento a un mensaje para el usuario (Req 3.18). */
  private mensajeRechazo(
    regla: ReglaDocumentoRegistro,
    motivo: string | undefined,
  ): string {
    switch (motivo) {
      case 'tamano_excedido': {
        const mb = Math.round(regla.tamanoMaxBytes / 1_048_576);
        return `El archivo supera el tamaño máximo permitido (${mb} MB).`;
      }
      case 'mime_no_permitido':
      case 'extension_no_permitida':
        return 'Formato no permitido. Usa PDF, JPG o PNG.';
      case 'vigencia_requerida':
      case 'vigencia_invalida':
        return 'No fue posible validar la vigencia del documento.';
      case 'vigencia_excedida':
        return `La vigencia del documento supera el máximo permitido (${regla.vigenciaMaxDias} días).`;
      default:
        return 'El documento no cumple las validaciones requeridas.';
    }
  }
}
