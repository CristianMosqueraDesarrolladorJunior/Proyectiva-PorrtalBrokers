import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ConsultaAsistente } from '../models/asistente.model';

/**
 * Respuesta orientativa del Servicio_Asistente (Asistente_IA) (Req 38).
 * El contenido debe escaparse/sanitizarse antes de renderizar (Req 38.16).
 */
export interface RespuestaAsistente {
  readonly contenido: string;
}

/**
 * Servicio del Chat_Asistente (Req 38).
 *
 * Envía la consulta al Servicio_Asistente del API_Backend vía `HttpClient` con
 * `withCredentials`. La PII debe redactarse en el cliente antes de invocar este
 * servicio (Req 38.15); la respuesta se escapa/sanitiza antes de renderizar (Req 38.16).
 */
@Injectable({ providedIn: 'root' })
export class AsistenteService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/asistente/consultas';

  /**
   * Envía una consulta (ya redactada de PII) al Asistente_IA (Req 38.5, 38.15).
   * @param consulta consulta del Broker sin PII ni secretos.
   * @returns la respuesta orientativa del asistente.
   */
  consultar(consulta: ConsultaAsistente): Observable<RespuestaAsistente> {
    return this.http.post<RespuestaAsistente>(this.baseUrl, consulta, {
      withCredentials: true,
    });
  }
}
