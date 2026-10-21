import { MENSAJE_CLAVE } from '../../../../core/util/clave-segura';
import { InfoTipComponent } from '../../../../shared/components/info-tip/info-tip.component';
import { SessionService } from '../../../../core/services/session.service';
import type { ErrorPortal } from '../../../../core/interceptors/error.interceptor';
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
  BotonComponent,
  CheckDeclaracionComponent,
  DocUploaderComponent,
  EscaleritaLoaderComponent,
  FormFieldComponent,
  IconComponent,
  ModalDialogComponent,
  SuccessScreenComponent,
} from '../../../../shared/components';
import type { ArchivoSeleccionado, ReglaDocumentoUploader } from '../../../../shared/components/doc-uploader/doc-uploader.component';
import { documentosRegistroBroker, type TipoDocumentoRegistro } from '../../../../core/models/registro-broker.model';
import type { TipoMimePermitido } from '../../../../core/models/documento.model';
import { PerfilService } from '../../../../core/services/perfil.service';
import { mensajeErrorIntegracion } from '../../../../core/util/errores-integracion';
import { reglaDeDocumentoRegistro, validarDocumento } from '../../../../shared/validation/documento-validacion';
import { AuthService } from '../../../../core/services/auth.service';
import { rutaInicio } from '../../../../core/guards/rol.guard';
import type { TipoDocumentoIdentidad } from '../../../../core/models/radicacion.model';
import { CatalogoService } from '../../../../core/services/catalogo.service';
import {
  CODIGO_PAIS_DEFECTO,
  DOCUMENTO_LONGITUD_MAX,
  DOCUMENTO_LONGITUD_MIN,
  NOMBRE_LONGITUD_MIN,
  PASSWORD_LONGITUD_MIN,
  TELEFONO_LONGITUD_MAX,
  TELEFONO_LONGITUD_MIN,
  esCiudadValida,
  esCodigoPaisValido,
  esCorreoValido,
  esDocumentoValido,
  esNombreValido,
  esPasswordValida,
  esTelefonoValido,
} from './registro-validacion';
import { PasoComoFuncionaComponent, REQUISITOS_REGISTRO } from './paso-como-funciona/paso-como-funciona.component';
import { SoloDigitosDirective } from '../../../../shared/directives/solo-digitos.directive';
import { VerClaveDirective } from '../../../../shared/directives/ver-clave.directive';
import { FeedbackService } from '../../../../shared/services/feedback/feedback.service';
import type { IdFeedback } from '../../../../shared/components/feedback/feedback.types';

/** Ruta de la pantalla de login (acceso "Ya tengo cuenta") (Req 2.3). */
const RUTA_LOGIN = '/login';

/**
 * Mensaje del alta según el error normalizado por el interceptor ({@link ErrorPortal}): en 409 el
 * backend indica en `fields` si el conflicto es el documento (`cedula`) o el correo.
 */
export function mensajeErrorRegistro(error: unknown): string {
  const { status, error: cuerpo } = (error ?? {}) as Partial<ErrorPortal>;
  const campos = cuerpo?.fields ?? [];
  if (status === 409) {
    if (campos.includes('cedula')) {
      return 'Ya existe una cuenta con este número de documento. Inicia sesión o restablece tu contraseña.';
    }
    if (campos.includes('correo')) {
      return 'Este correo ya está registrado con otra cuenta. Usa otro correo o inicia sesión.';
    }
    return 'Ya existe una cuenta con ese documento o correo. Inicia sesión o restablece tu contraseña.';
  }
  if (status === 503) {
    return 'El servicio de registro no está disponible en este momento. Intenta de nuevo en unos minutos.';
  }
  return 'No pudimos crear tu cuenta. Intenta de nuevo.';
}

/** Tipado del formulario reactivo (datos personales + documento). */
interface FormularioRegistro {
  readonly nombreCompleto: FormControl<string>;
  readonly correo: FormControl<string>;
  readonly codigoPais: FormControl<string>;
  readonly telefono: FormControl<string>;
  readonly ciudad: FormControl<string>;
  readonly tipoDocumento: FormControl<TipoDocumentoIdentidad>;
  readonly documento: FormControl<string>;
  readonly password: FormControl<string>;
  readonly passwordConfirmacion: FormControl<string>;
  /** Declara no haber trabajado para inmobiliarias en los últimos 12 meses (sin marcar por defecto). */
  readonly declaracionInmobiliaria: FormControl<boolean>;
  /** Autoriza el tratamiento de datos personales (sin marcar por defecto). */
  readonly aceptaTratamientoDatos: FormControl<boolean>;
}

/** Credenciales iniciales que se informan si el ingreso automático falla. */
interface Credenciales {
  readonly usuario: string;
  readonly contrasena: string;
  readonly titulo: string;
  readonly mensaje: string;
}

/**
 * Registro (`/registro-broker`): comparte la UI del login (mismo fondo y tarjeta).
 *
 * Asistente de tres pasos: 1) «Bienvenida» (de qué se trata y qué necesitas, con «Aceptar»), 2) «Tus datos» (crea la cuenta PROSPECTO y
 * abre la sesión) y 3) «Documentos» (los cuatro obligatorios). Al enviar se muestra la confirmación. El backend
 * revalida siempre (Req 3.23).
 */
@Component({
  selector: 'app-registro-broker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SoloDigitosDirective,
    VerClaveDirective,
    CheckDeclaracionComponent,
    ReactiveFormsModule,
    FormFieldComponent,
    IconComponent,
    BotonComponent,
    ModalDialogComponent,
    DocUploaderComponent,
    EscaleritaLoaderComponent,
      SuccessScreenComponent,
    PasoComoFuncionaComponent,
    InfoTipComponent,
  ],
  templateUrl: './registro-broker.component.html',
  styleUrl: './registro-broker.component.scss',
})
export class RegistroBrokerComponent {
  private readonly auth = inject(AuthService);
  private readonly sesion = inject(SessionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  /** El paso 3 usa los mismos servicios de Mi perfil (la sesión ya está abierta tras el paso 2). */
  private readonly perfilServicio = inject(PerfilService);
  private readonly feedback = inject(FeedbackService);

  /** Paso del asistente: 1 «Bienvenida», 2 «Tus datos» (crea la cuenta), 3 «Documentos». */
  protected readonly paso = signal<1 | 2 | 3>(1);
  /** Solicitud enviada: se muestra la confirmación en lugar del asistente. */
  protected readonly registroEnviado = signal(false);
  protected readonly requisitos = REQUISITOS_REGISTRO;

  // --- Paso 3 · Documentos (los cuatro obligatorios) ---
  private readonly documentosRegistro = documentosRegistroBroker(inject(CatalogoService).opciones('documento_legalizacion'));
  protected readonly reglasUploader: readonly ReglaDocumentoUploader[] = this.documentosRegistro.map((r) => ({
    id: r.tipo, etiqueta: r.etiqueta, descripcion: r.descripcion, icono: 'upload_file', obligatorio: true,
  }));
  protected readonly cargados = computed<Readonly<Record<string, string>>>(() =>
    Object.fromEntries(this.perfilServicio.perfil().documentos.filter((d) => d.archivo).map((d) => [d.tipo, d.archivo])),
  );
  protected readonly documentosCargados = computed(() => Object.keys(this.cargados()).length);
  protected readonly enviandoSolicitud = signal(false);
  /** «Enviar solicitud» solo se habilita con los documentos obligatorios completos. */
  protected readonly puedeEnviarSolicitud = this.perfilServicio.puedeCompletarRegistro;

  /** Constantes expuestas al template. */
  protected readonly nombreLongitudMin = NOMBRE_LONGITUD_MIN;
  protected readonly passwordLongitudMin = PASSWORD_LONGITUD_MIN;
  protected readonly mensajeClave = MENSAJE_CLAVE;
  protected readonly telefonoLongitudMin = TELEFONO_LONGITUD_MIN;
  protected readonly telefonoLongitudMax = TELEFONO_LONGITUD_MAX;
  protected readonly documentoLongitudMin = DOCUMENTO_LONGITUD_MIN;
  protected readonly documentoLongitudMax = DOCUMENTO_LONGITUD_MAX;
  /** Listas del formulario desde los catálogos de BD (`codigo_pais`, `ciudad`, `tipo_documento`). */
  private readonly catalogo = inject(CatalogoService);
  protected readonly codigosPais = this.catalogo.opciones('codigo_pais').map((c) => c.codigo);
  protected readonly ciudades = this.catalogo.opciones('ciudad').map((c) => c.descripcion);
  protected readonly tiposDocumento = this.catalogo.opciones('tipo_documento').filter((t) => t['registro_broker'] === true);
  protected readonly modulosRestringidos = this.catalogo.modulosRestringidos();
  /** Etapas del registro de broker. */
  protected readonly etapas = ['Bienvenida', 'Tus datos', 'Documentos'];

  /** Etapa completada: las anteriores a la actual. */
  protected etapaHecha(indice: number): boolean {
    return indice + 1 < this.paso();
  }

  /** Formulario reactivo. */
  protected readonly formulario = new FormGroup<FormularioRegistro>({
    nombreCompleto: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    correo: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    codigoPais: new FormControl(CODIGO_PAIS_DEFECTO, { nonNullable: true, validators: [Validators.required] }),
    telefono: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    ciudad: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    tipoDocumento: new FormControl<TipoDocumentoIdentidad>('CC', { nonNullable: true, validators: [Validators.required] }),
    documento: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    passwordConfirmacion: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    declaracionInmobiliaria: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
    aceptaTratamientoDatos: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
  });

  /** Signal que refleja los valores del formulario para recomputar validaciones. */
  private readonly valores = signal(this.formulario.getRawValue());

  // --- Envío ---
  /** Destino elegido mientras se crea la cuenta (`null` = no hay creación en curso). */
  protected readonly creandoHacia = signal<'inicio' | 'documentos' | null>(null);
  protected readonly credenciales = signal<Credenciales | null>(null);

  constructor() {
    this.formulario.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.valores.set(this.formulario.getRawValue());
    });
    this.autocompletarDesdePerfilCompartido();
  }

  /**
   * Autocompleta el formulario con lo que el usuario ya registró en Cien Cuadras, para
   * no volver a pedírselo. Solo llena campos vacíos y solo con valores válidos; sin
   * sesión o sin datos el formulario queda como está.
   */
  private autocompletarDesdePerfilCompartido(): void {
    // Solo con sesión (llegada por SSO desde Cien Cuadras): en el registro público evita un 401 innecesario.
    if (!this.sesion.perfil()) {
      return;
    }
    this.auth
      .perfilCompartido()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (perfil) => {
          if (!perfil) {
            return;
          }
          const actual = this.formulario.getRawValue();
          const nombre = [perfil.nombre, perfil.apellido].filter(Boolean).join(' ').trim();
          const propuesto = {
            nombreCompleto: esNombreValido(nombre) ? nombre : '',
            correo: perfil.correo && esCorreoValido(perfil.correo) ? perfil.correo : '',
            telefono: perfil.telefono && esTelefonoValido(perfil.telefono) ? perfil.telefono : '',
            ciudad: perfil.ciudad && esCiudadValida(perfil.ciudad, this.ciudades) ? perfil.ciudad : '',
            documento:
              perfil.numeroIdentificacion && esDocumentoValido(perfil.numeroIdentificacion)
                ? perfil.numeroIdentificacion
                : '',
          };
          const cambios = Object.fromEntries(
            Object.entries(propuesto).filter(
              ([campo, valor]) => valor && !actual[campo as keyof typeof propuesto],
            ),
          );
          this.formulario.patchValue(cambios);
        },
        // Sin sesión (401) o sin proveedor: no hay nada que autocompletar.
        error: () => undefined,
      });
  }

  /** Validez de los datos personales y el documento. */
  protected readonly datosValidos = computed(() => {
    const v = this.valores();
    return (
      esNombreValido(v.nombreCompleto) &&
      esCorreoValido(v.correo) &&
      esCodigoPaisValido(v.codigoPais, this.codigosPais) &&
      esTelefonoValido(v.telefono) &&
      esCiudadValida(v.ciudad, this.ciudades) &&
      this.tiposDocumento.some((t) => t.codigo === v.tipoDocumento) &&
      esDocumentoValido(v.documento) &&
      esPasswordValida(v.password, v.documento) &&
      v.password === v.passwordConfirmacion &&
      v.declaracionInmobiliaria &&
      v.aceptaTratamientoDatos
    );
  });

  /** Mensaje cuando intenta avanzar sin otorgar la declaración (conserva los demás datos del paso). */
  protected get errorDeclaracion(): string {
    const control = this.formulario.controls.declaracionInmobiliaria;
    return control.touched && !control.value ? 'Debes confirmar esta declaración para continuar.' : '';
  }

  protected get errorTratamientoDatos(): string {
    const control = this.formulario.controls.aceptaTratamientoDatos;
    return control.touched && !control.value ? 'Debes autorizar el tratamiento de tus datos para continuar.' : '';
  }

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
    return this.mensajeError('ciudad', esCiudadValida(this.valores().ciudad, this.ciudades), 'Selecciona una ciudad de la lista.');
  }

  protected get errorDocumento(): string {
    return this.mensajeError('documento', esDocumentoValido(this.valores().documento),
      `El documento debe contener entre ${DOCUMENTO_LONGITUD_MIN} y ${DOCUMENTO_LONGITUD_MAX} dígitos.`);
  }

  protected get errorPassword(): string {
    return this.mensajeError('password', esPasswordValida(this.valores().password, this.valores().documento), MENSAJE_CLAVE);
  }

  protected get errorPasswordConfirmacion(): string {
    const v = this.valores();
    const coincide =
      v.password === v.passwordConfirmacion && esPasswordValida(v.passwordConfirmacion);
    return this.mensajeError('passwordConfirmacion', coincide, 'Las contraseñas no coinciden.');
  }

  /** Paso 1: el prospecto aceptó la bienvenida y pasa a «Tus datos». */
  protected aceptarComoFunciona(): void {
    this.paso.set(2);
  }

  /**
   * Crea la cuenta (PROSPECTO), abre la sesión y sigue: a «Documentos» si continúa el registro, o al portal si prefiere
   * completar después.
   */
  protected crearCuenta(destino: 'inicio' | 'documentos'): void {
    if (!this.datosValidos() || this.creandoHacia()) {
      this.formulario.markAllAsTouched();
      return;
    }
    const v = this.valores();
    this.creandoHacia.set(destino);
    this.auth
      .registrarProspecto({
        nombreCompleto: v.nombreCompleto.trim(),
        correo: v.correo.trim(),
        codigoPais: v.codigoPais,
        telefono: v.telefono,
        ciudad: v.ciudad,
        tipoDocumento: v.tipoDocumento,
        documento: v.documento,
        password: v.password,
        declaracionInmobiliaria: v.declaracionInmobiliaria,
        aceptaTratamientoDatos: v.aceptaTratamientoDatos,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.auth
            .login({ usuario: v.correo.trim(), password: v.password })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (perfil) => {
                this.creandoHacia.set(null);
                this.feedback.exito({
                  titulo: '¡Bienvenido a Proyectiva!',
                  mensaje:
                    destino === 'inicio'
                      ? 'Tu cuenta quedó creada. Ya puedes cotizar y radicar.'
                      : 'Tu cuenta quedó creada. Sigue con tus documentos para calificarte como broker.',
                  acciones: { confirmar: destino === 'inicio' ? 'Empezar' : 'Continuar' },
                });
                if (destino === 'inicio') {
                  void this.router.navigate([rutaInicio(perfil.rol)]);
                  return;
                }
                // Continúa el registro: la sesión ya está abierta; sigue en el asistente (paso 3).
                this.perfilServicio.cargar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ error: () => undefined });
                this.paso.set(3);
              },
              error: () => {
                this.creandoHacia.set(null);
                this.credenciales.set({
                  usuario: v.documento,
                  contrasena: v.password,
                  titulo: 'Tu cuenta ya está creada',
                  mensaje: 'No pudimos iniciar sesión automáticamente. Ingresa con tu documento y la contraseña que definiste.',
                });
              },
            });
        },
        error: (error: unknown) => {
          this.creandoHacia.set(null);
          this.feedback.error({ titulo: 'No pudimos crear tu cuenta', mensaje: mensajeErrorRegistro(error) });
        },
      });
  }

  /** Paso 3: valida el archivo con la lógica compartida y lo carga (el backend revalida siempre). */
  protected onDocumento(evento: ArchivoSeleccionado): void {
    const tipo = evento.id as TipoDocumentoRegistro;
    const regla = this.documentosRegistro.find((r) => r.tipo === tipo);
    if (!regla) {
      return;
    }
    const resultado = validarDocumento(
      {
        nombre: evento.archivo.name,
        tipoMime: evento.archivo.type as TipoMimePermitido,
        tamanoBytes: evento.archivo.size,
        fechaEmision: regla.vigenciaMaxDias !== null ? new Date(evento.archivo.lastModified).toISOString() : undefined,
      },
      reglaDeDocumentoRegistro(regla),
      new Date().toISOString(),
    );
    if (!resultado.valido) {
      this.feedback.toast({
        variante: 'error',
        mensaje:
          resultado.motivo === 'vigencia_excedida'
            ? `${regla.etiqueta}: debe tener máximo ${regla.vigenciaMaxDias} días de expedida.`
            : resultado.motivo === 'tamano_excedido'
              ? `${regla.etiqueta}: supera el tamaño máximo (${Math.round(regla.tamanoMaxBytes / 1_048_576)} MB).`
              : `${regla.etiqueta}: formato no permitido. Usa PDF, JPG o PNG.`,
      });
      return;
    }
    this.perfilServicio
      .reemplazarDocumento(tipo, evento.archivo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // Un solo aviso a la vez: el de la carga anterior se reemplaza en vez de apilarse.
          if (this.toastCarga) this.feedback.cerrar(this.toastCarga);
          this.toastCarga = this.feedback.toast({ variante: 'exito', mensaje: `${regla.etiqueta} cargado.` });
        },
        error: (err: unknown) => this.feedback.toast({ variante: 'error', mensaje: mensajeErrorIntegracion(err) }),
      });
  }

  private toastCarga: IdFeedback | null = null;

  /** Paso 3: envía la solicitud de registro y muestra la confirmación. */
  protected enviarSolicitud(): void {
    if (!this.puedeEnviarSolicitud() || this.enviandoSolicitud()) {
      return;
    }
    this.enviandoSolicitud.set(true);
    this.perfilServicio
      .completarRegistro()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.enviandoSolicitud.set(false);
          this.registroEnviado.set(true);
        },
        error: (err: unknown) => {
          this.enviandoSolicitud.set(false);
          this.feedback.toast({ variante: 'error', mensaje: mensajeErrorIntegracion(err) });
        },
      });
  }

  /** «Completar después»: entra al portal como prospecto; los documentos siguen en Mi perfil. */
  protected irAlPortal(): void {
    void this.router.navigate([rutaInicio('BROKER')]);
  }

  /** «Aceptar» del aviso de credenciales: vuelve al login. */
  protected aceptarCredenciales(): void {
    this.credenciales.set(null);
    this.irALogin();
  }

  protected irALogin(): void {
    void this.router.navigate([RUTA_LOGIN]);
  }

  private mensajeError(control: keyof FormularioRegistro, valido: boolean, mensaje: string): string {
    const ctrl = this.formulario.controls[control];
    if (!ctrl.touched && !ctrl.dirty) {
      return '';
    }
    return valido ? '' : mensaje;
  }
}
