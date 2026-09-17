import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Datos de un Referido capturados por el Broker (Req 15.1, 15.2).
 */
export interface ReferidoRequest {
  readonly nombre: string;
  readonly cedula: string;
  readonly celular: string;
  readonly correo?: string;
  readonly producto: string;
  readonly comentario?: string;
}

/**
 * Confirmación de un Referido registrado (Req 15).
 */
export interface ReferidoResponse {
  readonly radicado: string;
  readonly estado: string;
}

/**
 * Fila del Estado de referidos (Req 15.4, 15.5).
 */
export interface Referido {
  readonly nombre: string;
  readonly producto: string;
  readonly estado: string;
  readonly fecha: string;
}

/**
 * KPIs y listado del Estado de referidos (Req 15.4, 15.5).
 */
export interface EstadoReferidosResponse {
  readonly total: number;
  readonly activos: number;
  readonly convertidos: number;
  readonly referidos: readonly Referido[];
}

/**
 * Filtros del Estado de referidos (Req 15.5).
 */
export interface FiltrosReferidos {
  readonly busqueda?: string;
  readonly estado?: string;
}

/**
 * Servicio de Referidos (Req 15).
 *
 * Registra un Referido y consulta los KPIs/listado con filtros desde el API_Backend
 * vía `HttpClient` con `withCredentials`.
 */
@Injectable({ providedIn: 'root' })
export class ReferidosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/referidos';

  /**
   * Registra un Referido (Req 15.1).
   * @param request datos del cliente referido.
   * @returns confirmación con radicado y estado.
   */
  referir(request: ReferidoRequest): Observable<ReferidoResponse> {
    return this.http.post<ReferidoResponse>(this.baseUrl, request, {
      withCredentials: true,
    });
  }

  /**
   * Obtiene los KPIs y el listado de referidos con filtros (Req 15.4, 15.5).
   * @param filtros criterios opcionales de búsqueda y estado.
   * @returns KPIs y listado del estado de referidos.
   */
  listar(filtros: FiltrosReferidos): Observable<EstadoReferidosResponse> {
    let params = new HttpParams();
    if (filtros.busqueda) {
      params = params.set('busqueda', filtros.busqueda);
    }
    if (filtros.estado) {
      params = params.set('estado', filtros.estado);
    }
    return this.http.get<EstadoReferidosResponse>(this.baseUrl, {
      params,
      withCredentials: true,
    });
  }
}
