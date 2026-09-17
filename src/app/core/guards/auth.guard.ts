import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { SessionService } from '../services/session.service';

/**
 * Guard funcional de autenticación (patrón `inject()`, análogo a `actorGuard` de PROYECTIVA).
 *
 * Protege las rutas del Shell_Aplicacion: si el Broker no está autenticado, redirige
 * a `/login`; si lo está, permite el acceso (Req 4.4). El estado de autenticación se
 * consulta a `SessionService`, que mantiene el perfil en memoria sin exponer el token
 * en JavaScript (Req 28.1).
 *
 * @returns `true` si el Broker está autenticado; en caso contrario un `UrlTree` hacia `/login`.
 */
export const authGuard: CanActivateFn = (): boolean | UrlTree => {
  const session = inject(SessionService);
  const router = inject(Router);

  if (session.autenticado()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};
