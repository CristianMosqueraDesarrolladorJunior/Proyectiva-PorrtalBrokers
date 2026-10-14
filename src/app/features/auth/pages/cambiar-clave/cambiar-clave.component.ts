import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { rutaInicio } from '../../../../core/guards/rol.guard';
import { AuthService } from '../../../../core/services/auth.service';
import { SessionService } from '../../../../core/services/session.service';
import { mensajeErrorIntegracion } from '../../../../core/util/errores-integracion';
import { FormClaveComponent, type CambioClave } from '../../../../shared/components';

/**
 * Cambio de clave obligatorio en el primer ingreso con una credencial generada por el portal
 * (prospecto o comercial creados desde la consola). Sin cambiarla no se entra a la plataforma.
 */
@Component({
  selector: 'app-cambiar-clave',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormClaveComponent],
  template: `
    <main class="cc">
      <section class="cc__tarjeta" aria-labelledby="cc-titulo">
        <span class="cc__marca">Proyectiva</span>
        <h1 id="cc-titulo">Crea tu contraseña</h1>
        <p class="cc__texto">
          Hola{{ nombre() ? ', ' + nombre() : '' }}. Entraste con una contraseña temporal: elige la tuya para continuar.
        </p>
        <app-form-clave
          id="cc"
          etiquetaActual="Contraseña temporal"
          textoBoton="Guardar y continuar"
          [enviando]="enviando()"
          [error]="error()"
          (guardar)="guardar($event)"
        />
      </section>
    </main>
  `,
  styles: [
    `
      .cc {
        display: grid;
        place-items: center;
        min-height: 100vh;
        padding: var(--space-6);
        background: var(--sb-slate);
      }
      .cc__tarjeta {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        width: 100%;
        max-width: 440px;
        padding: var(--space-8, 40px);
        border-radius: var(--radius-2xl);
        background: var(--sb-surface);
        box-shadow: var(--shadow-modal);
      }
      .cc__marca {
        font-size: var(--text-title);
        font-weight: var(--font-weight-bold);
        color: var(--sb-tertiary);
        text-align: center;
      }
      h1 {
        margin: 0;
        font-size: var(--text-heading);
        text-align: center;
        color: var(--sb-on-surface);
      }
      .cc__texto {
        margin: 0 0 var(--space-2);
        font-size: var(--text-body);
        text-align: center;
        color: var(--sb-secondary);
      }
    `,
  ],
})
export class CambiarClaveComponent {
  private readonly auth = inject(AuthService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly nombre = computed(() => this.session.perfil()?.nombre ?? '');
  protected readonly enviando = signal(false);
  protected readonly error = signal('');

  protected guardar(cambio: CambioClave): void {
    this.error.set('');
    this.enviando.set(true);
    this.auth
      .cambiarClave(cambio.actual, cambio.nueva)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.enviando.set(false);
          void this.router.navigate([rutaInicio(this.session.perfil()?.rol)]);
        },
        error: (err: unknown) => {
          this.enviando.set(false);
          const status = (err as { status?: number })?.status;
          this.error.set(
            status === 401 || status === 422
              ? 'La contraseña actual no es correcta. Si es tu primer ingreso, usa la contraseña temporal que te entregaron.'
              : mensajeErrorIntegracion(err),
          );
        },
      });
  }
}
