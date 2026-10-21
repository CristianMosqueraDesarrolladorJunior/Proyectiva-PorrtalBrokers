import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { EstadoOnboarding } from '../models/onboarding.model';

/**
 * Estado del recorrido de bienvenida. La cuenta y el perfil salen de la sesión en el backend: el cliente nunca envía
 * un identificador de usuario.
 */
@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/v1/onboarding/estado';

  /** Estado del recorrido del usuario de la sesión. */
  consultarEstado(): Observable<EstadoOnboarding> {
    return this.http.get<EstadoOnboarding>(this.url, { withCredentials: true });
  }

  /** Marca el recorrido del perfil como visto. */
  marcarVisto(): Observable<EstadoOnboarding> {
    return this.http.put<EstadoOnboarding>(this.url, { tourVisto: true }, { withCredentials: true });
  }
}
