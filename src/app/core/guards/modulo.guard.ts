import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateChildFn, Router, UrlTree } from '@angular/router';
import { Observable, map } from 'rxjs';

import { moduloBloqueado } from '../models/cuenta.model';
import { CatalogoService } from '../services/catalogo.service';
import { perfilDeLaSesion } from './rehidratar-sesion';

/**
 * Guard de módulos del portal del broker: un PROSPECTO no entra a los módulos restringidos del catálogo
 * `modulo_portal` (vuelve al seguimiento). Solo presentación: el gateway responde 403 igualmente.
 */
export const moduloGuard: CanActivateChildFn = (ruta: ActivatedRouteSnapshot): Observable<boolean | UrlTree> => {
  const router = inject(Router);
  const restringidas = inject(CatalogoService).modulosRestringidos().map((m) => m.ruta);
  const modulo = ruta.routeConfig?.path?.split('/')[0] ?? '';
  return perfilDeLaSesion().pipe(
    map((perfil) =>
      perfil?.estadoCuenta && moduloBloqueado(perfil.estadoCuenta, modulo, restringidas)
        ? router.createUrlTree(['/app/seguimiento'], { queryParams: { bloqueado: modulo } })
        : true,
    ),
  );
};
