import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

import { Rol } from '../models/broker.model';
import { SessionService } from '../services/session.service';

/** Ruta de inicio de cada rol después del login. */
export function rutaInicio(rol: Rol | undefined): string {
  return rol === 'ADMINISTRADOR' || rol === 'COMERCIAL' ? '/admin' : '/app';
}

/**
 * Guard por rol. Sin sesión → `/login`; con un rol no permitido → la ruta de
 * inicio de su rol.
 *
 * Es solo presentación: la autorización real la hace el backend en cada
 * endpoint (`/api/v1/admin/*` exige rol y filtra por la cartera de la sesión).
 */
export function rolGuard(...roles: Rol[]): CanActivateFn {
  return (): boolean | UrlTree => {
    const session = inject(SessionService);
    const router = inject(Router);
    const perfil = session.perfil();
    if (!perfil) {
      return router.createUrlTree(['/login']);
    }
    return roles.includes(perfil.rol) ? true : router.createUrlTree([rutaInicio(perfil.rol)]);
  };
}
