import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  BrokerAdminResponse,
  ComercialResponse,
  NegocioAdminResponse,
  ResumenAdminResponse,
} from '../models/admin.model';
import { SessionService } from './session.service';

/**
 * Servicio de la consola de administración (Servicio_Admin, Req 16).
 *
 * Consume exclusivamente los endpoints REST reales del API_Backend
 * (`/api/v1/admin/*`) vía `HttpClient` con `withCredentials: true` (cookie
 * `HttpOnly`). La autorización fina (rol y filtro por cartera) la aplica el
 * servidor con el `comercialId` de la sesión; el frontend nunca lo envía.
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly baseUrl = '/api/v1/admin';

  /** `true` si la sesión vigente es Administrador (rol en mayúsculas del backend). */
  esAdmin(): boolean {
    return this.session.perfil()?.rol === 'ADMINISTRADOR';
  }

  /**
   * Lista los comerciales visibles según el rol de la sesión (Req 16.1, 16.2).
   * @returns comerciales (todos para Administrador; su cartera para Comercial).
   */
  listarComerciales(): Observable<readonly ComercialResponse[]> {
    return this.http.get<ComercialResponse[]>(`${this.baseUrl}/comerciales`, {
      withCredentials: true,
    });
  }

  /**
   * Registra o actualiza un comercial (solo Administrador — Req 16.3, 16.4).
   * @param request datos del comercial (validados en servidor).
   * @returns el comercial persistido.
   */
  guardarComercial(request: GuardarComercialRequest): Observable<ComercialResponse> {
    return this.http.post<ComercialResponse>(`${this.baseUrl}/comerciales`, request, {
      withCredentials: true,
    });
  }

  /**
   * Obtiene el resumen de administración según el rol de la sesión (Req 16).
   * @returns KPIs, radicados por comercial y actividad reciente.
   */
  obtenerResumen(): Observable<ResumenAdminResponse> {
    return this.http.get<ResumenAdminResponse>(`${this.baseUrl}/resumen`, {
      withCredentials: true,
    });
  }

  /**
   * Lista los brokers de la cartera visibles según el rol de la sesión (Req 16.1, 16.2).
   * @param busqueda filtro opcional por nombre de broker o comercial.
   * @returns brokers (todos para Administrador; su cartera para Comercial).
   */
  listarBrokers(busqueda?: string): Observable<readonly BrokerAdminResponse[]> {
    let params = new HttpParams();
    if (busqueda && busqueda.trim().length > 0) {
      params = params.set('busqueda', busqueda.trim());
    }
    return this.http.get<BrokerAdminResponse[]>(`${this.baseUrl}/brokers`, {
      params,
      withCredentials: true,
    });
  }

  /**
   * Asigna (o reasigna) un broker a un comercial (solo Administrador — Req 16.3, 16.4).
   * @param brokerId identificador del broker.
   * @param comercialId identificador del comercial destino.
   * @returns el broker actualizado.
   */
  asignarComercial(brokerId: string, comercialId: string): Observable<BrokerAdminResponse> {
    return this.http.post<BrokerAdminResponse>(
      `${this.baseUrl}/brokers/${encodeURIComponent(brokerId)}/comercial`,
      { comercialId },
      { withCredentials: true },
    );
  }

  /**
   * Lista los negocios visibles según el rol de la sesión, con filtro opcional por etapa.
   * @param etapa filtro opcional de etapa (conjunto cerrado validado por el backend).
   * @returns negocios con el inquilino enmascarado.
   */
  listarNegocios(etapa?: string): Observable<readonly NegocioAdminResponse[]> {
    let params = new HttpParams();
    if (etapa && etapa.trim().length > 0) {
      params = params.set('etapa', etapa.trim());
    }
    return this.http.get<NegocioAdminResponse[]>(`${this.baseUrl}/negocios`, {
      params,
      withCredentials: true,
    });
  }
}

/** Datos para registrar/actualizar un comercial (contrato de `POST /admin/comerciales`). */
export interface GuardarComercialRequest {
  readonly comercialId: string;
  readonly nombre: string;
  readonly activo: boolean;
}
