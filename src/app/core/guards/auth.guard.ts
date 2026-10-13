import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, map } from 'rxjs';

import { perfilDeLaSesion } from './rehidratar-sesion';

/**
 * Guard funcional de autenticación (patrón `inject()`, análogo a `actorGuard` de PROYECTIVA).
 *
 * Protege las rutas del Shell_Aplicacion: si el Broker no está autenticado, redirige
 * a `/login`; si lo está, permite el acceso (Req 4.4). El estado de autenticación se
 * consulta a `SessionService`, que mantiene el perfil en memoria sin exponer el token
 * en JavaScript (Req 28.1).
 *
 * Tras recargar la página el perfil se rehidrata desde la cookie (`GET /auth/session`):
 * una sesión vigente no obliga a volver a iniciar sesión.
 *
 * @returns `true` si hay sesión; en caso contrario un `UrlTree` hacia `/login`.
 */
export const authGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const router = inject(Router);
  return perfilDeLaSesion().pipe(map((perfil) => (perfil ? true : router.createUrlTree(['/login']))));
};
