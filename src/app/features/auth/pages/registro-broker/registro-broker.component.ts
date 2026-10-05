import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  isDevMode,
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
  BotonComponent,
  DocUploaderComponent,
  EscaleritaLoaderComponent,
  FormFieldComponent,
  IconComponent,
  ModalDialogComponent,
} from '../../../../shared/components';
import type {
  ArchivoSeleccionado,
  ReglaDocumentoUploader,
} from '../../../../shared/components/doc-uploader/doc-uploader.component';
import { AuthService } from '../../../../core/services/auth.service';
import {
  DOCUMENTOS_REGISTRO_BROKER,
  type DocumentoRegistro,
  type ReglaDocumentoRegistro,
  type SolicitudRegistroBroker,
  type TipoDocumentoRegistro,
} from '../../../../core/models/registro-broker.model';
import type { TipoMimePermitido } from '../../../../core/models/documento.model';
import type {
  ResultadoSarlaftRadicacion,
  TipoDocumentoIdentidad,
} from '../../../../core/models/radicacion.model';
import { MODULOS_RESTRINGIDOS } from '../../../../core/models/cuenta.model';
import { ETIQUETA_TIPO_DOCUMENTO_IDENTIDAD } from '../../../radicacion/pages/radicacion/radicacion-presentacion';
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
  esNombreValido,
  esTelefonoValido,
} from './registro-validacion';
import { documentosRegistroCompletos } from './registro-envio';

/** Ruta de la pantalla de login (acceso "Ya tengo cuenta") (Req 2.3). */
const RUTA_LOGIN = '/login';

/** Texto legal mostrado junto al botón de envío (Req 3.20). */
const TEXTO_LEGAL =
  'Al enviar, aceptas nuestras Políticas de Privacidad y Términos de Uso.';

/** Tipos de documento de identidad admitidos para el registro de broker. */
const TIPOS_DOCUMENTO_REGISTRO: readonly TipoDocumentoIdentidad[] = ['CC', 'CE', 'NIT'];

type PasoRegistro = 1 | 2 | 3;

/** Estado de un documento de registro cargado en memoria (nombre + validez + tipo MIME). */
interface EstadoDocumento {
  readonly nombre: string;
  readonly tamanoBytes: number;
  readonly tipoMime: TipoMimePermitido;
  readonly fechaEmision?: string;
  readonly valido: boolean;
  readonly error?: string;
}

/** Tipado del formulario reactivo del paso 1 (datos personales + documento). */
interface FormularioRegistro {
  readonly nombreCompleto: FormControl<string>;
  readonly correo: FormControl<string>;
  readonly codigoPais: FormControl<string>;
  readonly telefono: FormControl<string>;
  readonly ciudad: FormControl<string>;
  readonly tipoDocumento: FormControl<TipoDocumentoIdentidad>;
  readonly documento: FormControl<string>;
}

/** Credenciales iniciales que se informan al terminar el registro. */
interface Credenciales {
  readonly usuario: string;
  readonly contrasena: string;
  readonly titulo: string;
  readonly mensaje: string;
}

/**
 * Registro (`/registro-broker`): asistente de 3 pasos que comparte la UI del
 * login (mismo fondo y tarjeta).
 *
 *  1. Datos personales y documento. Desde aquí el aspirante puede
 *     **registrarse como prospecto** (ingreso simple, spec backend Req 1.2) o
 *     **continuar** para registrarse como broker.
 *  2. Verificación SARLAFT con el documento del paso 1 (no se vuelve a pedir).
 *     Mismas 3 salidas que la radicación: actualizado → paso 3; desactualizado
 *     → URL de actualización y reconsulta; consultable → el caso pasa a
 *     Cumplimiento y termina en el portal.
 *  3. Documentos (identidad, certificación bancaria, autorización de pago, RUT).
 *
 * Al terminar se informa que el usuario es su documento y la contraseña su
 * correo, y se vuelve al login. El backend revalida SIEMPRE (Req 3.23).
 */
@Component({
  selector: 'app-registro-broker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    FormFieldComponent,
    IconComponent,
    BotonComponent,
    DocUploaderComponent,
    EscaleritaLoaderComponent,
    ModalDialogComponent,
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
  protected readonly tiposDocumento = TIPOS_DOCUMENTO_REGISTRO;
  protected readonly etiquetaTipoDocumento = ETIQUETA_TIPO_DOCUMENTO_IDENTIDAD;
  protected readonly modulosRestringidos = MODULOS_RESTRINGIDOS;
  protected readonly textoLegal = TEXTO_LEGAL;
  protected readonly modoDesarrollo = isDevMode();

  /** Reglas de los 4 documentos obligatorios adaptadas al uploader (Req 3.16). */
  protected readonly reglasUploader: readonly ReglaDocumentoUploader[] =
    DOCUMENTOS_REGISTRO_BROKER.map((regla) => ({
      id: regla.tipo,
      etiqueta: regla.etiqueta,
      descripcion: regla.descripcion,
      obligatorio: true,
    }));

  protected readonly paso = signal<PasoRegistro>(1);

  /** Formulario reactivo del paso 1. */
  protected readonly formulario = new FormGroup<FormularioRegistro>({
    nombreCompleto: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    correo: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    codigoPais: new FormControl(CODIGO_PAIS_DEFECTO, { nonNullable: true, validators: [Validators.required] }),
    telefono: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    ciudad: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    tipoDocumento: new FormControl<TipoDocumentoIdentidad>('CC', { nonNullable: true, validators: [Validators.required] }),
    documento: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  /** Signal que refleja los valores del formulario para recomputar validaciones. */
  private readonly valores = signal(this.formulario.getRawValue());

  /** Documentos cargados en memoria, indexados por tipo (Req 3.16). */
  private readonly documentos = signal<Partial<Record<TipoDocumentoRegistro, EstadoDocumento>>>({});

  // --- Paso 2: SARLAFT ---
  protected readonly sarlaft = signal<ResultadoSarlaftRadicacion | null>(null);
  protected readonly verificandoSarlaft = signal(false);
  protected readonly errorSarlaft = signal('');
  protected readonly enlaceCopiado = signal(false);

  // --- Envíos ---
  protected readonly registrandoProspecto = signal(false);
  protected readonly enviando = signal(false);
  protected readonly errorEnvio = signal('');
  protected readonly credenciales = signal<Credenciales | null>(null);

  constructor() {
    this.formulario.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      const previo = this.valores();
      const actual = this.formulario.getRawValue();
      this.valores.set(actual);
      // Un cambio en el documento invalida la verificación SARLAFT previa.
      if (previo.documento !== actual.documento || previo.tipoDocumento !== actual.tipoDocumento) {
        this.sarlaft.set(null);
        this.documentos.set({});
      }
    });
  }

  /** Validez del paso 1 (datos personales + documento). */
  protected readonly datosValidos = computed(() => {
    const v = this.valores();
    return (
      esNombreValido(v.nombreCompleto) &&
      esCorreoValido(v.correo) &&
      esCodigoPaisValido(v.codigoPais) &&
      esTelefonoValido(v.telefono) &&
      esCiudadValida(v.ciudad) &&
      TIPOS_DOCUMENTO_REGISTRO.includes(v.tipoDocumento) &&
      esDocumentoValido(v.documento)
    );
  });

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

  private readonly tiposDocumentosValidos = computed<TipoDocumentoRegistro[]>(() => {
    const estado = this.documentos();
    return (Object.keys(estado) as TipoDocumentoRegistro[]).filter((tipo) => estado[tipo]?.valido === true);
  });

  protected readonly documentosCompletos = computed(() =>
    documentosRegistroCompletos(this.tiposDocumentosValidos()),
  );

  protected readonly puedeEnviar = computed(
    () =>
      this.datosValidos() &&
      this.sarlaft()?.estado === 'actualizado' &&
      this.documentosCompletos() &&
      !this.enviando(),
  );

  /** Avance del asistente (se muestra al pie de la tarjeta). */
  protected readonly progreso = computed(() => [
    { titulo: 'Tus datos', hecho: this.datosValidos() && this.paso() > 1, activo: this.paso() === 1 },
    { titulo: 'SARLAFT', hecho: this.sarlaft()?.estado === 'actualizado', activo: this.paso() === 2 },
    {
      titulo: `Documentos ${this.tiposDocumentosValidos().length}/${DOCUMENTOS_REGISTRO_BROKER.length}`,
      hecho: this.documentosCompletos(),
      activo: this.paso() === 3,
    },
  ]);

  // --- Mensajes de error por campo (solo tras interacción) ---
  protected get errorNombre(): string {
    return this.mensajeError('nombreCompleto', esNombreValido(this.valores().nombreCompleto),
      `El nombre es obligatorio y debe tener al menos ${NOMBRE_LONGITUD_MIN} caracteres.`);
  }

  protected get errorCorreo(): string {
    return this.mensajeError('correo', esCorreoValido(this.valores().correo), 'Ingresa un correo electrónico válido.');
  }

  protected get errorTelefono(): string {
    return this.mensajeError('telefono', esTelefonoValido(this.valores().telefono),
      `El teléfono debe contener entre ${TELEFONO_LONGITUD_MIN} y ${TELEFONO_LONGITUD_MAX} dígitos.`);
  }

  protected get errorCiudad(): string {
    return this.mensajeError('ciudad', esCiudadValida(this.valores().ciudad), 'Selecciona una ciudad de la lista.');
  }

  protected get errorDocumento(): string {
    return this.mensajeError('documento', esDocumentoValido(this.valores().documento),
      `El documento debe contener entre ${DOCUMENTO_LONGITUD_MIN} y ${DOCUMENTO_LONGITUD_MAX} dígitos.`);
  }

  // ===========================================================================
  // Paso 1
  // ===========================================================================

  /** Ingreso simple: la cuenta queda como PROSPECTO y se informan las credenciales. */
  protected registrarComoProspecto(): void {
    if (!this.datosValidos() || this.registrandoProspecto()) {
      this.formulario.markAllAsTouched();
      return;
    }
    const v = this.valores();
    this.registrandoProspecto.set(true);
    this.errorEnvio.set('');
    this.auth
      .registrarProspecto({
        nombreCompleto: v.nombreCompleto.trim(),
        correo: v.correo.trim(),
        codigoPais: v.codigoPais,
        telefono: v.telefono,
        ciudad: v.ciudad,
        tipoDocumento: v.tipoDocumento,
        documento: v.documento,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.registrandoProspecto.set(false);
          this.credenciales.set({
            ...this.credencialesIniciales(),
            titulo: '¡Ya eres prospecto!',
            mensaje: 'Tu cuenta quedó creada. Ya puedes radicar y cotizar; completa tu registro de broker cuando quieras desde "Mi perfil".',
          });
        },
        error: () => {
          this.registrandoProspecto.set(false);
          this.errorEnvio.set('No fue posible crear tu cuenta. Intenta de nuevo.');
        },
      });
  }

  /** Continúa el registro como broker (paso 2: SARLAFT). */
  protected continuar(): void {
    if (!this.datosValidos()) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.errorEnvio.set('');
    this.paso.set(2);
  }

  // ===========================================================================
  // Paso 2 · SARLAFT (3 salidas)
  // ===========================================================================

  protected verificarSarlaft(): void {
    if (this.verificandoSarlaft()) {
      return;
    }
    const v = this.valores();
    this.verificandoSarlaft.set(true);
    this.errorSarlaft.set('');
    this.enlaceCopiado.set(false);
    this.auth
      .verificarSarlaftRegistro({ tipoDocumento: v.tipoDocumento, documento: v.documento, correo: v.correo.trim() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resultado) => {
          this.verificandoSarlaft.set(false);
          this.sarlaft.set(resultado);
        },
        error: () => {
          this.verificandoSarlaft.set(false);
          this.errorSarlaft.set('No fue posible verificar tu SARLAFT. Intenta de nuevo.');
        },
      });
  }

  protected copiarEnlace(enlace: string | undefined): void {
    if (!enlace) {
      return;
    }
    void navigator.clipboard
      ?.writeText(enlace)
      .then(() => this.enlaceCopiado.set(true))
      .catch(() => this.enlaceCopiado.set(false));
  }

  protected irAPaso(paso: PasoRegistro): void {
    if (paso === 3 && this.sarlaft()?.estado !== 'actualizado') {
      return;
    }
    this.paso.set(paso);
  }

  // ===========================================================================
  // Paso 3 · Documentos
  // ===========================================================================

  /** Valida MIME/extensión, tamaño y vigencia con la lógica pura compartida (Req 3.16–3.18). */
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
      fechaEmision: regla.vigenciaMaxDias !== null ? new Date(evento.archivo.lastModified).toISOString() : undefined,
    };
    const resultado = validarDocumento(documentoCargado, reglaDeDocumentoRegistro(regla), new Date().toISOString());
    this.documentos.update((estado) => ({
      ...estado,
      [tipo]: {
        nombre: evento.archivo.name,
        tamanoBytes: evento.archivo.size,
        tipoMime,
        fechaEmision: documentoCargado.fechaEmision,
        valido: resultado.valido,
        error: resultado.valido ? undefined : this.mensajeRechazo(regla, resultado.motivo),
      },
    }));
  }

  protected errorDocumentoCargado(tipo: string): string {
    return this.documentos()[tipo as TipoDocumentoRegistro]?.error ?? '';
  }

  /** Envía la Solicitud_Registro_Broker (Req 3.21, 3.24). */
  protected enviarSolicitud(): void {
    this.errorEnvio.set('');
    const solicitud = this.construirSolicitud();
    if (!this.puedeEnviar() || solicitud === null) {
      return;
    }
    this.enviando.set(true);
    this.auth
      .registrarSolicitud(solicitud)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.credenciales.set({
            ...this.credencialesIniciales(),
            titulo: 'Solicitud de broker enviada',
            mensaje: 'Revisaremos tus documentos. Mientras tanto tu cuenta queda como prospecto: ya puedes radicar y cotizar, y tus comisiones se acreditan al ser aprobado.',
          });
        },
        error: () => {
          this.enviando.set(false);
          this.errorEnvio.set('No fue posible enviar la solicitud. Intenta de nuevo.');
        },
      });
  }

  // ===========================================================================
  // Navegación
  // ===========================================================================

  /** "Aceptar" del aviso de credenciales: vuelve al login. */
  protected aceptarCredenciales(): void {
    this.credenciales.set(null);
    this.irALogin();
  }

  protected irALogin(): void {
    void this.router.navigate([RUTA_LOGIN]);
  }

  // ===========================================================================
  // Privados
  // ===========================================================================

  private credencialesIniciales(): Pick<Credenciales, 'usuario' | 'contrasena'> {
    const v = this.valores();
    return { usuario: v.documento, contrasena: v.correo.trim() };
  }

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
      tipoDocumento: v.tipoDocumento,
      documento: v.documento,
      estadoSarlaft: this.sarlaft()?.estado,
      documentos,
    };
  }

  private mensajeError(control: keyof FormularioRegistro, valido: boolean, mensaje: string): string {
    const ctrl = this.formulario.controls[control];
    if (!ctrl.touched && !ctrl.dirty) {
      return '';
    }
    return valido ? '' : mensaje;
  }

  /** Traduce el motivo de rechazo de un documento a un mensaje para el usuario (Req 3.18). */
  private mensajeRechazo(regla: ReglaDocumentoRegistro, motivo: string | undefined): string {
    switch (motivo) {
      case 'tamano_excedido':
        return `El archivo supera el tamaño máximo permitido (${Math.round(regla.tamanoMaxBytes / 1_048_576)} MB).`;
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
