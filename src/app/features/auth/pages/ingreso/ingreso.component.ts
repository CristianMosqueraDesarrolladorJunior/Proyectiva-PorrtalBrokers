import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

import { BotonComponent } from '../../../../shared/components';
import { AuthService } from '../../../../core/services/auth.service';
import { rutaInicio } from '../../../../core/guards/rol.guard';

/** Nombre del parámetro del fragmento de la URL que trae el token. */
const PARAMETRO_TOKEN = 'token';

/**
 * Lee el token del fragmento de la URL (`#token=...`). Función pura.
 *
 * El token viaja en el fragmento y no en la query porque el fragmento no se
 * envía al servidor ni queda en sus registros de acceso.
 *
 * @param fragmento fragmento de la URL, con o sin `#` inicial.
 * @returns el token, o cadena vacía si no viene.
 */
export function leerTokenDelFragmento(fragmento: string): string {
  const limpio = fragmento.startsWith('#') ? fragmento.slice(1) : fragmento;
  return new URLSearchParams(limpio).get(PARAMETRO_TOKEN)?.trim() ?? '';
}

/**
 * Entrada del broker que llega ya autenticado desde Cien Cuadras (`/ingreso#token=...`).
 *
 * Entrega el token al backend, que lo verifica y abre la sesión sin pedir
 * credenciales de nuevo. El token se retira de la barra de direcciones antes de
 * usarlo y nunca se guarda en JavaScript: la sesión queda en la cookie `HttpOnly`.
 * Si el token falta o no es válido, se ofrece el ingreso normal.
 */
@Component({
  selector: 'app-ingreso',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BotonComponent],
  template: `
    <main class="ingreso" role="main">
      @if (error()) {
        <p class="ingreso__mensaje" role="alert">
          No pudimos abrir tu sesión desde Cien Cuadras. Ingresa con tu cédula o correo y tu contraseña.
        </p>
        <app-boton variante="primary" (clicked)="irAlLogin()">Ir a iniciar sesión</app-boton>
      } @else {
        <p class="ingreso__mensaje" role="status">Abriendo tu sesión…</p>
      }
    </main>
  `,
  styles: `
    .ingreso {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-4);
      min-height: 100vh;
      padding: var(--space-6);
      text-align: center;
    }

    .ingreso__mensaje {
      margin: var(--space-0);
      max-width: 40ch;
      color: var(--color-text);
      font-size: var(--text-body);
      line-height: var(--line-height-normal);
    }
  `,
})
export class IngresoComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly error = signal(false);

  ngOnInit(): void {
    const token = leerTokenDelFragmento(window.location.hash);
    // Retira el token de la barra de direcciones y del historial del navegador.
    this.location.replaceState('/ingreso');
    if (!token) {
      this.error.set(true);
      return;
    }
    this.auth
      .ingresarConToken(token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (perfil) => void this.router.navigate([rutaInicio(perfil?.rol)]),
        error: () => this.error.set(true),
      });
  }

  protected irAlLogin(): void {
    void this.router.navigate(['/login']);
  }
}
