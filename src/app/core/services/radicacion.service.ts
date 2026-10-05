import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  ConsultaSarlaftRadicacionRequest,
  RadicacionRequest,
  ResultadoEstudioArrendamiento,
  ResultadoSarlaftRadicacion,
} from '../models/radicacion.model';

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

  /**
   * Consulta la API SARLAFT del paso 4. El backend decide la salida
   * (actualizado / desactualizado / consultable); en `consultable` el caso ya
   * queda registrado en el Warehouse y la respuesta trae el radicado.
   * @param request documento del propietario y destinatario de la URL.
   * @returns resultado de la consulta SARLAFT.
   */
  consultarSarlaft(
    request: ConsultaSarlaftRadicacionRequest,
  ): Observable<ResultadoSarlaftRadicacion> {
    return this.http.post<ResultadoSarlaftRadicacion>(`${this.baseUrl}/sarlaft`, request, {
      withCredentials: true,
    });
  }

  /**
   * Consulta la API de Estudio de Arrendamiento del paso 2 (API-gate). El backend
   * decide la salida: `aprobado` permite continuar; `no_aprobado` bloquea el
   * proceso y devuelve la URL de Estudio Digital para que el inquilino lo realice.
   * @param numeroEstudio número de estudio de arrendamiento a consultar.
   * @returns resultado del estudio (estado y, si aplica, URL de estudio digital).
   */
  consultarEstudio(
    numeroEstudio: string,
  ): Observable<ResultadoEstudioArrendamiento> {
    return this.http.post<ResultadoEstudioArrendamiento>(
      `${this.baseUrl}/estudio`,
      { numeroEstudio },
      { withCredentials: true },
    );
  }
}
