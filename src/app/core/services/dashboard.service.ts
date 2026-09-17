import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  DetalleSolicitud,
  PaginaResultado,
  Solicitud,
} from '../models/solicitud.model';

/**
 * Desglose de comisión estimada por producto mostrado en el Dashboard (Req 5.2).
 */
export interface DesgloseComisionProducto {
  readonly producto: string;
  readonly valor: number;
}

/**
 * Comisión estimada del periodo y su desglose (Req 5.2, 5.6).
 */
export interface ComisionesResponse {
  readonly valorEstimado: number;
  readonly periodo: string;
  readonly polizasRadicadas: number;
  readonly desglose: readonly DesgloseComisionProducto[];
}

/**
 * KPIs del Dashboard: primas generadas, radicadas, en revisión y bloqueadas (Req 5.3, 5.6).
 */
export interface KpisDashboard {
  readonly primasGeneradas: number;
  readonly totalRadicadas: number;
  readonly enRevision: number;
  readonly bloqueadas: number;
}

/**
 * Filtros del listado de solicitudes de Seguimiento (Req 6.2).
 */
export interface FiltrosSolicitudes {
  readonly busqueda?: string;
  readonly producto?: string;
  readonly estado?: string;
  readonly fechaDesde?: string;
  readonly fechaHasta?: string;
}

/**
 * Servicio del Dashboard y Seguimiento (Req 5, 6, 34).
 *
 * Obtiene comisiones, KPIs y el listado paginado/filtrado de solicitudes, además
 * del Detalle_Solicitud, desde el API_Backend vía `HttpClient` con `withCredentials`
 * (Req 5.6, 6.2, 34.4).
 */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1';

  /**
   * Obtiene la comisión estimada y su desglose por producto (Req 5.2, 5.6).
   * @returns comisiones del periodo vigente.
   */
  obtenerComisiones(): Observable<ComisionesResponse> {
    return this.http.get<ComisionesResponse>(
      `${this.baseUrl}/dashboard/comisiones`,
      { withCredentials: true },
    );
  }

  /**
   * Obtiene los KPIs del Dashboard (Req 5.3, 5.6).
   * @returns KPIs de primas, radicadas, en revisión y bloqueadas.
   */
  obtenerKpis(): Observable<KpisDashboard> {
    return this.http.get<KpisDashboard>(`${this.baseUrl}/dashboard/kpis`, {
      withCredentials: true,
    });
  }

  /**
   * Obtiene el listado filtrado y paginado de solicitudes (Req 6.2, 6.5).
   * @param filtros criterios opcionales de búsqueda, producto, estado y fechas.
   * @param page número de página (0-based).
   * @param size tamaño de página (10 por página).
   * @returns una página de resultados de solicitudes.
   */
  listarSolicitudes(
    filtros: FiltrosSolicitudes,
    page: number,
    size: number,
  ): Observable<PaginaResultado<Solicitud>> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size));

    if (filtros.busqueda) {
      params = params.set('busqueda', filtros.busqueda);
    }
    if (filtros.producto) {
      params = params.set('producto', filtros.producto);
    }
    if (filtros.estado) {
      params = params.set('estado', filtros.estado);
    }
    if (filtros.fechaDesde) {
      params = params.set('fechaDesde', filtros.fechaDesde);
    }
    if (filtros.fechaHasta) {
      params = params.set('fechaHasta', filtros.fechaHasta);
    }

    return this.http.get<PaginaResultado<Solicitud>>(
      `${this.baseUrl}/solicitudes`,
      { params, withCredentials: true },
    );
  }

  /**
   * Obtiene el Detalle_Solicitud (con línea de tiempo) por su referencia (Req 34.4).
   * La PII llega enmascarada desde el backend (Req 34.5).
   * @param referencia identificador de la solicitud seleccionada.
   * @returns el detalle de la solicitud con sus hitos.
   */
  obtenerDetalleSolicitud(referencia: string): Observable<DetalleSolicitud> {
    return this.http.get<DetalleSolicitud>(
      `${this.baseUrl}/solicitudes/${encodeURIComponent(referencia)}`,
      { withCredentials: true },
    );
  }
}
