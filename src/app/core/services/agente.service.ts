import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { EventoAgente, RespuestaAgente } from '../models/agente.model';

/**
 * Servicio del Agente IA (diagrama 10).
 *
 * El front solo habla con el BFF (`POST /api/v1/agente/mensajes`) usando la
 * cookie HttpOnly de la sesión. Nunca llama al LLM ni al agente directamente.
 * En desarrollo responde el motor mock del `mockBackendInterceptor`.
 */
@Injectable({ providedIn: 'root' })
export class AgenteService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/agente/mensajes';

  /** Envía un mensaje, un archivo (solo id) o la confirmación del broker. */
  enviar(evento: EventoAgente): Observable<RespuestaAgente> {
    return this.http.post<RespuestaAgente>(this.baseUrl, evento, {
      withCredentials: true,
    });
  }
}
