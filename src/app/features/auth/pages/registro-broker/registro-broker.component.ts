import { SessionService } from '../../../../core/services/session.service';
import { HttpErrorResponse } from '@angular/common/http';
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
  DocUploaderComponent,
  EscaleritaLoaderComponent,
  FormFieldComponent,
  IconComponent,
  ModalDialogComponent,
} from '../../../../shared/components';
import type { ArchivoSeleccionado, ReglaDocumentoUploader } from '../../../../shared/components/doc-uploader/doc-uploader.component';
import { documentosRegistroBroker, type TipoDocumentoRegistro } from '../../../../core/models/registro-broker.model';
import type { TipoMimePermitido } from '../../../../core/models/documento.model';
import { PerfilService } from '../../../../core/services/perfil.service';
import { mensajeErrorIntegracion } from '../../../../core/util/errores-integracion';
import { abrirFormularioSarlaft } from '../../../../core/util/sarlaft-enlace';
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

/** Ruta de la pantalla de login (acceso "Ya tengo cuenta") (Req 2.3). */
const RUTA_LOGIN = '/login';

/** Perfil del broker: ahí, ya con sesión, se verifica SARLAFT y se cargan los documentos. */
const RUTA_PERFIL = '/app/perfil';

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
 * Con los datos personales y el documento se crea la cuenta (PROSPECTO) y se abre la
 * sesión. "Registrarme como prospecto" lleva al inicio; "Continuar como broker" lleva
 * al perfil, donde con la sesión ya abierta se verifica SARLAFT y se cargan los 4
 * documentos (los endpoints de SARLAFT y legalización exigen sesión). El backend
 * revalida SIEMPRE (Req 3.23).
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
    ModalDialogComponent,
    DocUploaderComponent,
    EscaleritaLoaderComponent,
  ],
  templateUrl: './registro-broker.component.html',
  styleUrl: './registro-broker.component.scss',
})
export class RegistroBrokerComponent {
  private readonly auth = inject(AuthService);
  private readonly sesion = inject(SessionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  /** Pasos 2 y 3 usan los mismos servicios de Mi perfil (la sesión ya está abierta tras el paso 1). */
  private readonly perfilServicio = inject(PerfilService);
  protected readonly perfil = this.perfilServicio.perfil;
  protected readonly abrirFormularioSarlaft = abrirFormularioSarlaft;

  /** Paso del asistente: 1 datos (crea la cuenta), 2 Conocimiento de Cliente, 3 documentos. */
  protected readonly paso = signal<1 | 2 | 3>(1);

  // --- Paso 2 · SARLAFT ---
  protected readonly consultandoSarlaft = signal(false);
  protected readonly sarlaftConsultado = signal(false);
  protected readonly errorSarlaft = signal('');
  protected readonly puedeConsultarSarlaft = computed(() => !this.consultandoSarlaft());
  /** Celular registrado (últimos 4 dígitos) al que SARLAFT envía el enlace; nulo si no es celular. */
  protected readonly celularEnlace = computed(() => {
    const d = (this.perfil().telefono ?? '').replace(/\D/g, '');
    return /^3\d{9}$/.test(d) ? '··· ' + d.slice(-4) : null;
  });
  protected readonly reglaSarlaftFisico: readonly ReglaDocumentoUploader[] = [
    { id: 'formularioSarlaft', etiqueta: 'Cargar SARLAFT físico', descripcion: 'Formulario de Conocimiento de Cliente diligenciado y firmado (PDF, JPG o PNG)', icono: 'upload_file', obligatorio: false },
  ];
  protected readonly cargadoSarlaftFisico = computed<Readonly<Record<string, string>>>(() =>
    this.perfil().sarlaft.fisico ? { formularioSarlaft: this.perfil().sarlaft.fisico as string } : ({} as Record<string, string>),
  );

  // --- Paso 3 · Documentos ---
  private readonly documentosRegistro = documentosRegistroBroker(inject(CatalogoService).opciones('documento_legalizacion'));
  protected readonly reglasUploader: readonly ReglaDocumentoUploader[] = this.documentosRegistro.map((r) => ({
    id: r.tipo, etiqueta: r.etiqueta, descripcion: r.descripcion, icono: 'upload_file', obligatorio: true,
  }));
  protected readonly cargados = computed<Readonly<Record<string, string>>>(() =>
    Object.fromEntries(this.perfil().documentos.filter((d) => d.archivo).map((d) => [d.tipo, d.archivo])),
  );
  protected readonly mensajeCarga = signal('');
  protected readonly errorCarga = signal('');
  protected readonly enviandoSolicitud = signal(false);
  protected readonly puedeCompletarRegistro = this.perfilServicio.puedeCompletarRegistro;

  /** Constantes expuestas al template. */
  protected readonly nombreLongitudMin = NOMBRE_LONGITUD_MIN;
  protected readonly passwordLongitudMin = PASSWORD_LONGITUD_MIN;
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
  /** Etapas del registro de broker (las dos últimas se completan en el perfil). */
  protected readonly etapas = ['Tus datos', 'Conocimiento de Cliente', 'Documentos'];

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
  });

  /** Signal que refleja los valores del formulario para recomputar validaciones. */
  private readonly valores = signal(this.formulario.getRawValue());

  // --- Envío ---
  /** Destino elegido mientras se crea la cuenta (`null` = no hay creación en curso). */
  protected readonly creandoHacia = signal<'inicio' | 'perfil' | null>(null);
  protected readonly errorEnvio = signal('');
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
      esPasswordValida(v.password) &&
      v.password === v.passwordConfirmacion
    );
  });

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
    return this.mensajeError('password', esPasswordValida(this.valores().password),
      `La contraseña debe tener al menos ${PASSWORD_LONGITUD_MIN} caracteres e incluir mayúscula, minúscula y número.`);
  }

  protected get errorPasswordConfirmacion(): string {
    const v = this.valores();
    const coincide =
      v.password === v.passwordConfirmacion && esPasswordValida(v.passwordConfirmacion);
    return this.mensajeError('passwordConfirmacion', coincide, 'Las contraseñas no coinciden.');
  }

  /**
   * Crea la cuenta (PROSPECTO), abre la sesión y navega: al inicio si se queda como
   * prospecto, o al perfil para seguir con SARLAFT y documentos si continúa como broker.
   */
  protected crearCuenta(destino: 'inicio' | 'perfil'): void {
    if (!this.datosValidos() || this.creandoHacia()) {
      this.formulario.markAllAsTouched();
      return;
    }
    const v = this.valores();
    this.creandoHacia.set(destino);
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
        password: v.password,
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
                if (destino === 'inicio') {
                  void this.router.navigate([rutaInicio(perfil.rol)]);
                  return;
                }
                // Continúa como broker: la sesión ya está abierta; sigue en el asistente (paso 2).
                this.perfilServicio.cargar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ error: () => undefined });
                this.paso.set(2);
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
          this.errorEnvio.set(
            error instanceof HttpErrorResponse && error.status === 409
              ? 'Ya existe una cuenta con ese documento o correo. Inicia sesión o restablece tu contraseña.'
              : 'No fue posible crear tu cuenta. Intenta de nuevo.',
          );
        },
      });
  }

  /** Paso 2: consulta el Conocimiento de Cliente con el documento (sin fecha); desactualizado → SMS al celular. */
  protected verificarSarlaft(): void {
    if (!this.puedeConsultarSarlaft()) {
      return;
    }
    this.consultandoSarlaft.set(true);
    this.errorSarlaft.set('');
    this.perfilServicio
      .actualizarSarlaft()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.consultandoSarlaft.set(false);
          this.sarlaftConsultado.set(true);
        },
        error: () => {
          this.consultandoSarlaft.set(false);
          this.errorSarlaft.set('No pudimos consultar tu Conocimiento de Cliente en este momento. Intenta de nuevo o termina después desde Mi perfil.');
        },
      });
  }

  /** Paso 2: alternativa al enlace, carga el SARLAFT físico (queda en revisión del área) y deja continuar. */
  protected onSarlaftFisico(evento: ArchivoSeleccionado): void {
    this.errorSarlaft.set('');
    this.perfilServicio
      .cargarSarlaftFisico(evento.archivo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.sarlaftConsultado.set(true),
        error: (err: unknown) => this.errorSarlaft.set(mensajeErrorIntegracion(err)),
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
      this.errorCarga.set(
        resultado.motivo === 'vigencia_excedida'
          ? `${regla.etiqueta}: debe tener máximo ${regla.vigenciaMaxDias} días de expedida.`
          : resultado.motivo === 'tamano_excedido'
            ? `${regla.etiqueta}: supera el tamaño máximo (${Math.round(regla.tamanoMaxBytes / 1_048_576)} MB).`
            : `${regla.etiqueta}: formato no permitido. Usa PDF, JPG o PNG.`,
      );
      return;
    }
    this.errorCarga.set('');
    this.perfilServicio
      .reemplazarDocumento(tipo, evento.archivo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.mensajeCarga.set(`${regla.etiqueta} cargado.`),
        error: (err: unknown) => this.errorCarga.set(mensajeErrorIntegracion(err)),
      });
  }

  /** Paso 3: envía la solicitud de registro y lleva a Mi perfil, donde se ve "en revisión". */
  protected enviarSolicitud(): void {
    if (!this.puedeCompletarRegistro() || this.enviandoSolicitud()) {
      return;
    }
    this.enviandoSolicitud.set(true);
    this.perfilServicio
      .completarRegistro()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => void this.router.navigate([RUTA_PERFIL], { queryParams: { registro: 1 } }),
        error: (err: unknown) => {
          this.enviandoSolicitud.set(false);
          this.errorCarga.set(mensajeErrorIntegracion(err));
        },
      });
  }

  /** "Completar después": entra al portal como prospecto; SARLAFT y documentos siguen en Mi perfil. */
  protected irAlPortal(): void {
    void this.router.navigate([rutaInicio('BROKER')]);
  }

  /** "Aceptar" del aviso de credenciales: vuelve al login. */
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
