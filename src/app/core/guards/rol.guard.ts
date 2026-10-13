import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

import { Observable, map } from 'rxjs';

import { Rol } from '../models/broker.model';
import { perfilDeLaSesion } from './rehidratar-sesion';

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
  return (): Observable<boolean | UrlTree> => {
    const router = inject(Router);
    return perfilDeLaSesion().pipe(
      map((perfil) => {
        if (!perfil) {
          return router.createUrlTree(['/login']);
        }
        if (perfil.debeCambiarClave) {
          return router.createUrlTree(['/cambiar-clave']);
        }
        return roles.includes(perfil.rol) ? true : router.createUrlTree([rutaInicio(perfil.rol)]);
      }),
    );
  };
}
