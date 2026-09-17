import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  CotizacionRequest,
  CotizacionResult,
} from '../models/cotizacion.model';

/**
 * Servicio del Cotizador (Req 7, 8, 9).
 *
 * Envía los datos de la Cotizacion al Motor_Tarifas del API_Backend, que ejecuta
 * el cálculo autoritativo de prima, IVA y total (Req 8.2–8.5), y consulta las
 * ciudades cubiertas por departamento (Req 7.2, 7.3). Consumo vía `HttpClient`
 * con `withCredentials`.
 */
@Injectable({ providedIn: 'root' })
export class CotizadorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1';

  /**
   * Solicita el cálculo autoritativo de la Cotizacion al Motor_Tarifas (Req 8).
   * @param request datos del inmueble y coberturas seleccionadas.
   * @returns el desglose y totales de la cotización.
   */
  calcular(request: CotizacionRequest): Observable<CotizacionResult> {
    return this.http.post<CotizacionResult>(
      `${this.baseUrl}/cotizaciones`,
      request,
      { withCredentials: true },
    );
  }

  /**
   * Obtiene las ciudades con cobertura de un departamento (Req 7.2, 7.3).
   * @param departamento departamento seleccionado por el Broker.
   * @returns lista de ciudades cubiertas.
   */
  ciudadesPorDepartamento(departamento: string): Observable<readonly string[]> {
    const params = new HttpParams().set('departamento', departamento);
    return this.http.get<readonly string[]>(
      `${this.baseUrl}/cobertura/ciudades`,
      { params, withCredentials: true },
    );
  }
}
