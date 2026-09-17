import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ContratoArrendamientoRequest } from '../models/contrato.model';

/**
 * Confirmación de la generación del Contrato_Arrendamiento (Req 30.7).
 */
export interface ContratoArrendamientoResponse {
  readonly radicado: string;
  readonly estado: string;
}

/**
 * Servicio del Generador_Contrato de Arrendamiento (Req 30).
 *
 * Envía los datos del contrato multipaso al API_Backend, que revalida y genera el
 * Contrato_Arrendamiento (Req 30.9). Consumo vía `HttpClient` con `withCredentials`.
 */
@Injectable({ providedIn: 'root' })
export class ContratoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/contratos/arrendamiento';

  /**
   * Solicita la generación del Contrato_Arrendamiento (Req 30.7).
   * @param request datos de arrendador, arrendatario, inmueble y condiciones.
   * @returns confirmación con radicado y estado.
   */
  generar(
    request: ContratoArrendamientoRequest,
  ): Observable<ContratoArrendamientoResponse> {
    return this.http.post<ContratoArrendamientoResponse>(this.baseUrl, request, {
      withCredentials: true,
    });
  }
}
