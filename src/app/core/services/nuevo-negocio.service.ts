import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  NuevoNegocioRequest,
  ParametrosPreciosNN,
  ResumenNuevoNegocio,
} from '../models/nuevo-negocio.model';

/**
 * Confirmación de un Nuevo_Negocio registrado (Req 31.7).
 */
export interface NuevoNegocioResponse {
  readonly radicado: string;
  readonly estado: string;
  readonly primaTotal: number;
}

/**
 * Servicio del Nuevo_Negocio (Req 31).
 *
 * Solicita el cálculo autoritativo del resumen financiero al Motor_Precios_NN del
 * API_Backend (Req 31.5, 31.6, 31.8) y registra el negocio. Consumo vía `HttpClient`
 * con `withCredentials`. El borrador (Req 31.9) se conserva en el estado del feature,
 * nunca en `localStorage`.
 */
@Injectable({ providedIn: 'root' })
export class NuevoNegocioService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/nuevosNegocios';

  /**
   * Solicita el resumen financiero autoritativo al Motor_Precios_NN (Req 31.5).
   * @param parametros parámetros financieros del paso 2.
   * @returns el resumen calculado por el backend.
   */
  calcularResumen(
    parametros: ParametrosPreciosNN,
  ): Observable<ResumenNuevoNegocio> {
    return this.http.post<ResumenNuevoNegocio>(
      `${this.baseUrl}/resumen`,
      parametros,
      { withCredentials: true },
    );
  }

  /**
   * Registra el Nuevo_Negocio (Req 31.7).
   * @param request datos del cliente y parámetros financieros.
   * @returns confirmación con radicado, estado y prima total.
   */
  registrar(
    request: NuevoNegocioRequest,
  ): Observable<NuevoNegocioResponse> {
    return this.http.post<NuevoNegocioResponse>(this.baseUrl, request, {
      withCredentials: true,
    });
  }
}
