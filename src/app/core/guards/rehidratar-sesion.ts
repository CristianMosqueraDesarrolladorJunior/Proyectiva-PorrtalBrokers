import { inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { PerfilBroker } from '../models/broker.model';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';

/**
 * Perfil de la sesión vigente. El perfil vive solo en memoria (Req 28.1), así que tras
 * recargar la página se rehidrata con `GET /auth/session` usando la cookie HttpOnly;
 * sin sesión válida devuelve `null`. Debe llamarse en un contexto de inyección (guards).
 */
export function perfilDeLaSesion(): Observable<PerfilBroker | null> {
  const actual = inject(SessionService).perfil();
  if (actual) {
    return of(actual);
  }
  return inject(AuthService)
    .sesion()
    .pipe(
      map((perfil) => perfil ?? null),
      catchError(() => of(null)),
    );
}
