import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';

import { BotonComponent, FormFieldComponent, IconComponent } from '../../../../shared/components';
import { AuthService } from '../../../../core/services/auth.service';
import { rutaInicio } from '../../../../core/guards/rol.guard';
import { LoginRequest } from '../../../../core/models/broker.model';
import {
  USUARIO_LONGITUD_MAX,
  esPasswordValida,
  esUsuarioValido,
  validarLogin,
} from './login-validacion';

/** Ruta del formulario de Solicitud_Registro_Broker (Req 1.8, 2.1, 2.2). */
const RUTA_REGISTRO_BROKER = '/registro-broker';

/**
 * Mensaje de error genérico de credenciales inválidas (Req 1.2, 1.3).
 * No revela cuál campo es incorrecto ni si el usuario existe.
 */
const MENSAJE_CREDENCIALES_INVALIDAS =
  'Usuario o contraseña incorrectos. Verifica tus datos e intenta de nuevo. Tras 5 intentos fallidos el acceso se bloquea 15 minutos.';

/** Mensaje cuando el servicio de ingreso no responde (no es un error de credenciales). */
const MENSAJE_SERVICIO_NO_DISPONIBLE =
  'No pudimos validar tu ingreso en este momento. Intenta de nuevo en unos minutos.';

/**
 * Confirmación del restablecimiento de contraseña. Es la misma exista o no la
 * cuenta, para no revelar qué usuarios están registrados.
 */
const MENSAJE_RESTABLECIMIENTO =
  'Si tu cédula o correo están registrados, te enviamos un correo con el enlace para crear o cambiar tu contraseña. Si eres parte del equipo comercial, pide al administrador que restablezca tu acceso.';

/** Mensaje cuando se pide restablecer la contraseña sin haber escrito el usuario. */
const MENSAJE_USUARIO_REQUERIDO =
  'Escribe tu cédula o tu correo para enviarte el enlace.';

/** Tipado del formulario reactivo de login. */
interface FormularioLogin {
  readonly usuario: FormControl<string>;
  readonly password: FormControl<string>;
}

/**
 * Página de login unificado (`/login`) (Req 1, 2).
 *
 * El usuario ingresa con su cédula o su correo y su contraseña. Reutiliza los
 * Componentes_Compartidos `FormFieldComponent` y `BotonComponent` (sin duplicar
 * marcado) y delega la validación de cliente en la lógica pura
 * `login-validacion.ts` (Req 1.4). El botón de ingreso permanece deshabilitado
 * mientras el formulario sea inválido; ante credenciales inválidas muestra un
 * mensaje genérico sin revelar el campo (Req 1.2, 1.3).
 *
 * La autenticación se delega en `AuthService`, que consume el backend vía
 * `HttpClient` con `withCredentials` (cookie `HttpOnly`); el token nunca se
 * almacena en JavaScript (Req 28.1). Tras el éxito, navega al Shell_Aplicacion.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, FormFieldComponent, BotonComponent, IconComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** Longitud máxima del usuario expuesta al template. */
  protected readonly usuarioLongitudMax = USUARIO_LONGITUD_MAX;

  /** Formulario reactivo de credenciales. */
  protected readonly formulario = new FormGroup<FormularioLogin>({
    usuario: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  /** Mensaje de error mostrado ante un ingreso fallido (Req 1.2). */
  protected readonly errorCredenciales = signal('');

  /** Mensaje informativo tras solicitar el restablecimiento de contraseña. */
  protected readonly avisoRestablecimiento = signal('');

  /** Indica que hay una solicitud de login en curso (deshabilita el envío). */
  protected readonly enviando = signal(false);

  /** Indica que hay una solicitud de restablecimiento en curso. */
  protected readonly restableciendo = signal(false);

  /** Verdadero si el usuario ingresado es una cédula o un correo válidos (Req 1.4). */
  protected get usuarioValido(): boolean {
    return esUsuarioValido(this.formulario.controls.usuario.value);
  }

  /** Verdadero si la contraseña ingresada no está vacía (Req 1.4). */
  protected get passwordValida(): boolean {
    return esPasswordValida(this.formulario.controls.password.value);
  }

  /** Verdadero si el formulario completo es válido para enviar (Req 1.4). */
  protected get formularioValido(): boolean {
    const { usuario, password } = this.formulario.getRawValue();
    return validarLogin(usuario, password).formularioValido;
  }

  /** Mensaje de error del campo usuario, solo tras interacción del usuario. */
  protected get errorUsuario(): string {
    const control = this.formulario.controls.usuario;
    if (!control.touched && !control.dirty) {
      return '';
    }
    return this.usuarioValido ? '' : 'Ingresa tu número de cédula o un correo válido.';
  }

  /** Mensaje de error del campo contraseña, solo tras interacción del usuario. */
  protected get errorPassword(): string {
    const control = this.formulario.controls.password;
    if (!control.touched && !control.dirty) {
      return '';
    }
    return this.passwordValida ? '' : 'La contraseña es obligatoria.';
  }

  /**
   * Envía las credenciales al Servicio_Autenticacion (Req 1.1).
   *
   * Valida en cliente antes de enviar (fail-fast, Req 1.4); ante credenciales
   * inválidas muestra el mensaje genérico (Req 1.2, 1.3). No almacena token en
   * JS: la cookie `HttpOnly` la gestiona el backend/interceptor (Req 28.1).
   */
  protected iniciarSesion(): void {
    this.errorCredenciales.set('');
    this.avisoRestablecimiento.set('');
    if (!this.formularioValido || this.enviando()) {
      this.formulario.markAllAsTouched();
      return;
    }

    const credenciales: LoginRequest = {
      usuario: this.formulario.controls.usuario.value.trim(),
      password: this.formulario.controls.password.value,
    };

    this.enviando.set(true);
    this.auth
      .login(credenciales)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (perfil) => {
          this.enviando.set(false);
          // Broker → /app; Administrador y Comercial → consola /admin.
          void this.router
            .navigate([perfil?.debeCambiarClave ? '/cambiar-clave' : rutaInicio(perfil?.rol)])
            .then((navego) => {
              // Si un guard rechaza la navegación, la pantalla no se queda muda en /login.
              if (!navego) {
                this.errorCredenciales.set('No pudimos abrir tu sesión. Intenta de nuevo.');
              }
            });
        },
        error: (error: { status?: number }) => {
          this.enviando.set(false);
          this.errorCredenciales.set(
            error?.status === 503 ? MENSAJE_SERVICIO_NO_DISPONIBLE : MENSAJE_CREDENCIALES_INVALIDAS,
          );
        },
      });
  }

  /**
   * Solicita el correo para crear o cambiar la contraseña ("primera vez" u
   * olvido). El mensaje es el mismo exista o no la cuenta.
   */
  protected restablecerPassword(): void {
    this.errorCredenciales.set('');
    this.avisoRestablecimiento.set('');
    if (this.restableciendo()) {
      return;
    }
    if (!this.usuarioValido) {
      this.formulario.controls.usuario.markAsTouched();
      this.errorCredenciales.set(MENSAJE_USUARIO_REQUERIDO);
      return;
    }

    this.restableciendo.set(true);
    this.auth
      .restablecerPassword(this.formulario.controls.usuario.value.trim())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.restableciendo.set(false);
          this.avisoRestablecimiento.set(MENSAJE_RESTABLECIMIENTO);
        },
        error: () => {
          this.restableciendo.set(false);
          this.errorCredenciales.set(MENSAJE_SERVICIO_NO_DISPONIBLE);
        },
      });
  }

  /** Navega al formulario de Solicitud_Registro_Broker (Req 1.8, 2.1, 2.2). */
  protected irARegistro(): void {
    void this.router.navigate([RUTA_REGISTRO_BROKER]);
  }
}
