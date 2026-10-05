import { Component, DestroyRef, inject, isDevMode, signal } from '@angular/core';
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
import { ADMIN_DEMO } from '../../../../core/services/admin.service';
import { LoginRequest } from '../../../../core/models/broker.model';
import {
  CEDULA_LONGITUD_MAX,
  CEDULA_LONGITUD_MIN,
  esCedulaValida,
  esPasswordValida,
  validarLogin,
} from './login-validacion';

/** Ruta del formulario de Solicitud_Registro_Broker (Req 1.8, 2.1, 2.2). */
const RUTA_REGISTRO_BROKER = '/registro-broker';

/**
 * Mensaje de error genérico de credenciales inválidas (Req 1.2, 1.3).
 * No revela cuál campo es incorrecto ni si la cédula existe.
 */
const MENSAJE_CREDENCIALES_INVALIDAS =
  'Cédula o contraseña incorrectas. Verifica tus datos e intenta de nuevo.';

/** Tipado del formulario reactivo de login. */
interface FormularioLogin {
  readonly cedula: FormControl<string>;
  readonly password: FormControl<string>;
}

/**
 * Página de login del Broker (`/login`) (Req 1, 2).
 *
 * Reutiliza los Componentes_Compartidos `FormFieldComponent` y `BotonComponent`
 * (sin duplicar marcado) y delega la validación de cliente en la lógica pura
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

  /** Longitud mínima de cédula expuesta al template (Req 1.4). */
  protected readonly cedulaLongitudMin = CEDULA_LONGITUD_MIN;

  /** Longitud máxima de cédula expuesta al template (Req 1.4). */
  protected readonly cedulaLongitudMax = CEDULA_LONGITUD_MAX;

  /** Formulario reactivo de credenciales. */
  protected readonly formulario = new FormGroup<FormularioLogin>({
    cedula: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  /** Mensaje de error genérico mostrado ante credenciales inválidas (Req 1.2). */
  protected readonly errorCredenciales = signal('');

  /** Indica que hay una solicitud de login en curso (deshabilita el envío). */
  protected readonly enviando = signal(false);

  /** Verdadero si la cédula ingresada es válida (Req 1.4). */
  protected get cedulaValida(): boolean {
    return esCedulaValida(this.formulario.controls.cedula.value);
  }

  /** Verdadero si la contraseña ingresada no está vacía (Req 1.4). */
  protected get passwordValida(): boolean {
    return esPasswordValida(this.formulario.controls.password.value);
  }

  /** Verdadero si el formulario completo es válido para enviar (Req 1.4). */
  protected get formularioValido(): boolean {
    const { cedula, password } = this.formulario.getRawValue();
    return validarLogin(cedula, password).formularioValido;
  }

  /** Mensaje de error del campo cédula, solo tras interacción del usuario. */
  protected get errorCedula(): string {
    const control = this.formulario.controls.cedula;
    if (!control.touched && !control.dirty) {
      return '';
    }
    if (this.cedulaValida) {
      return '';
    }
    return `La cédula debe contener solo dígitos, entre ${CEDULA_LONGITUD_MIN} y ${CEDULA_LONGITUD_MAX} caracteres.`;
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
    if (!this.formularioValido || this.enviando()) {
      this.formulario.markAllAsTouched();
      return;
    }

    const credenciales: LoginRequest = {
      cedula: this.formulario.controls.cedula.value,
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
          void this.router.navigate([rutaInicio(perfil?.rol)]);
        },
        error: () => {
          this.enviando.set(false);
          this.errorCredenciales.set(MENSAJE_CREDENCIALES_INVALIDAS);
        },
      });
  }

  /** Navega al formulario de Solicitud_Registro_Broker (Req 1.8, 2.1, 2.2). */
  /** Muestra el acceso del equipo interno (consola de administración). */
  protected readonly accesoInterno = signal(false);

  /** Credenciales de demostración: solo existen en desarrollo. */
  protected readonly demoAdmin = isDevMode() ? ADMIN_DEMO : null;

  protected alternarAccesoInterno(): void {
    this.accesoInterno.update((v) => !v);
  }

  /** Llena el formulario con el administrador de demostración (solo desarrollo). */
  protected usarDemoAdmin(): void {
    if (!this.demoAdmin) {
      return;
    }
    this.formulario.setValue({ cedula: this.demoAdmin.cedula, password: this.demoAdmin.clave });
    this.formulario.markAllAsTouched();
  }

  protected irARegistro(): void {
    void this.router.navigate([RUTA_REGISTRO_BROKER]);
  }
}
