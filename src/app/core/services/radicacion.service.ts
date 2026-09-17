import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { RadicacionRequest } from '../models/radicacion.model';

/**
 * Confirmación de una Radicacion registrada (Req 10, 11).
 */
export interface RadicacionResponse {
  readonly radicado: string;
  readonly estado: string;
}

/**
 * Servicio de Radicacion de póliza (Req 10, 11, 12).
 *
 * Registra la radicación con sus documentos en el API_Backend, que revalida tipo,
 * formato y presencia (Req 10.5, 13.5). Consumo vía `HttpClient` con `withCredentials`.
 */
@Injectable({ providedIn: 'root' })
export class RadicacionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/radicaciones';

  /**
   * Registra una Radicacion con sus documentos (Req 10, 11).
   * @param request datos base de la radicación y documentos cargados.
   * @returns confirmación con radicado y estado.
   */
  radicar(request: RadicacionRequest): Observable<RadicacionResponse> {
    return this.http.post<RadicacionResponse>(this.baseUrl, request, {
      withCredentials: true,
    });
  }
}
