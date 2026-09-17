import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { DocumentoCargado } from '../models/documento.model';

/**
 * Solicitud de Correccion_Documento con el documento corregido y observaciones (Req 32).
 */
export interface CorreccionRequest {
  readonly referencia: string;
  readonly documentoCorregido: DocumentoCargado;
  readonly observaciones?: string;
}

/**
 * Confirmación de una Correccion_Documento registrada (Req 32.6).
 */
export interface CorreccionResponse {
  readonly radicado: string;
  readonly estado: string;
  readonly tiempoEstimadoRevision: string;
}

/**
 * Servicio de Correccion_Documento (Req 32).
 *
 * Registra la corrección del documento con sus observaciones en el API_Backend vía
 * `HttpClient` con `withCredentials`. El backend revalida tipo, formato y presencia.
 */
@Injectable({ providedIn: 'root' })
export class CorreccionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/correcciones';

  /**
   * Registra una Correccion_Documento (Req 32.6).
   * @param request referencia del trámite, documento corregido y observaciones.
   * @returns confirmación con radicado, estado y tiempo estimado de revisión.
   */
  registrar(request: CorreccionRequest): Observable<CorreccionResponse> {
    return this.http.post<CorreccionResponse>(this.baseUrl, request, {
      withCredentials: true,
    });
  }
}
