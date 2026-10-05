import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  CasoEspecialRequest,
  ConsultaSarlaftRenovacionRequest,
  NoRenovacionRequest,
  ResultadoSarlaftRenovacion,
  SolicitudRenovacionRequest,
  RenovacionRequest,
} from '../models/renovacion.model';
import { Poliza } from '../models/poliza.model';

/**
 * Confirmación de una operación del flujo de renovación (Req 17–23).
 */
export interface RenovacionResponse {
  readonly radicado: string;
  readonly estado: string;
}

/**
 * Portafolio de pólizas para la Gestión de Renovaciones (Req 16, 17).
 * Incluye los conteos por estado y el listado de pólizas.
 */
export interface PortafolioRenovaciones {
  readonly total: number;
  readonly renovadas: number;
  readonly proximasARenovar: number;
  readonly aPuntoDeVencer: number;
  readonly polizas: readonly Poliza[];
}

/**
 * Servicio del flujo de Renovacion, No Renovación y Caso Especial (Req 17–23).
 *
 * Registra las operaciones del flujo de renovación en el API_Backend vía `HttpClient`
 * con `withCredentials`. El backend revalida los datos capturados.
 */
@Injectable({ providedIn: 'root' })
export class RenovacionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/renovaciones';

  /**
   * Obtiene el portafolio de pólizas para la Gestión de Renovaciones (Req 16, 17).
   * @returns conteos por estado y el listado de pólizas del broker.
   */
  portafolio(): Observable<PortafolioRenovaciones> {
    return this.http.get<PortafolioRenovaciones>(`${this.baseUrl}/portafolio`, {
      withCredentials: true,
    });
  }

  /**
   * Registra una Renovacion de póliza (Req 17–21).
   * @param request datos del propietario, póliza, modalidad y documentos.
   * @returns confirmación con radicado y estado.
   */
  renovar(request: RenovacionRequest): Observable<RenovacionResponse> {
    return this.http.post<RenovacionResponse>(this.baseUrl, request, {
      withCredentials: true,
    });
  }

  /**
   * Notifica una No Renovación con su motivo (Req 22).
   * @param request número de póliza, motivo y observaciones opcionales.
   * @returns confirmación con radicado y estado.
   */
  noRenovar(request: NoRenovacionRequest): Observable<RenovacionResponse> {
    return this.http.post<RenovacionResponse>(
      `${this.baseUrl}/noRenovacion`,
      request,
      { withCredentials: true },
    );
  }

  /**
   * Registra un Caso Especial de renovación (Otro Sí / Cesión) (Req 23).
   * @param request número de póliza, tipo, documento legal y observaciones.
   * @returns confirmación con radicado y estado.
   */
  casoEspecial(request: CasoEspecialRequest): Observable<RenovacionResponse> {
    return this.http.post<RenovacionResponse>(
      `${this.baseUrl}/casosEspeciales`,
      request,
      { withCredentials: true },
    );
  }

  /**
   * Valida el SARLAFT de la póliza antes de enviar cualquier gestión de renovación.
   * Vigente si el certificado tiene menos de 36 meses; si no, se reconsulta
   * adjuntando el SARLAFT actualizado.
   */
  validarSarlaft(
    request: ConsultaSarlaftRenovacionRequest,
  ): Observable<ResultadoSarlaftRenovacion> {
    return this.http.post<ResultadoSarlaftRenovacion>(`${this.baseUrl}/sarlaft`, request, {
      withCredentials: true,
    });
  }

  /** Registra una renovación física o digital tras el SARLAFT vigente. */
  solicitar(request: SolicitudRenovacionRequest): Observable<RenovacionResponse> {
    return this.http.post<RenovacionResponse>(`${this.baseUrl}/solicitudes`, request, {
      withCredentials: true,
    });
  }
}
