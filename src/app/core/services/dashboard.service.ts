import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  DetalleSolicitud,
  DocumentoSolicitud,
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
 * Comisión pendiente por pagar (pólizas expedidas dentro del plazo de cobro y sin pago del área) y su
 * desglose por estado de cobro. La calcula el backend desde Postgres.
 */
export interface ComisionesResponse {
  readonly valorEstimado: number;
  readonly periodo: string;
  /** Pólizas expedidas del broker (el total sobre el que se calcula «X con comisión pendiente»). */
  readonly polizasRadicadas: number;
  readonly desglose: readonly DesgloseComisionProducto[];
  /** Pólizas que componen la comisión pendiente. */
  readonly polizasPendientes: number;
}

/**
 * KPIs del Dashboard: primas generadas, radicadas, en revisión y bloqueadas (Req 5.3, 5.6).
 */
export interface KpisDashboard {
  readonly primasGeneradas: number;
  readonly totalRadicadas: number;
  /** Todo lo que no está expedido ni cerrado: radicadas, en gestión, por corregir o aprobadas. */
  readonly enRevision: number;
  readonly bloqueadas: number;
  /** Pólizas expedidas: `totalRadicadas = emitidas + enRevision + bloqueadas`. */
  readonly emitidas: number;
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

/** Parámetros HTTP de los filtros de Seguimiento (solo los que tienen valor). */
function paramsFiltros(filtros: FiltrosSolicitudes): HttpParams {
  let params = new HttpParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor) params = params.set(clave, valor);
  }
  return params;
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
  obtenerKpis(filtros: FiltrosSolicitudes = {}): Observable<KpisDashboard> {
    // Con filtros, los KPIs salen de las mismas radicaciones que muestra la tabla filtrada.
    const params = paramsFiltros(filtros);
    return params.keys().length
      ? this.http.get<KpisDashboard>(`${this.baseUrl}/solicitudes/kpis`, { params, withCredentials: true })
      : this.http.get<KpisDashboard>(`${this.baseUrl}/dashboard/kpis`, { withCredentials: true });
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
    const params = paramsFiltros(filtros).set('page', String(page)).set('size', String(size));

    return this.http.get<PaginaResultado<Solicitud>>(
      `${this.baseUrl}/solicitudes`,
      { params, withCredentials: true },
    );
  }

  /**
   * Obtiene el Detalle_Solicitud (con línea de tiempo) por su referencia (Req 34.4).
   * Los datos llegan completos (el broker ve sus negocios sin enmascarar).
   * @param referencia identificador de la solicitud seleccionada.
   * @returns el detalle de la solicitud con sus hitos.
   */
  obtenerDetalleSolicitud(referencia: string): Observable<DetalleSolicitud> {
    return this.http.get<DetalleSolicitud>(
      `${this.baseUrl}/solicitudes/${encodeURIComponent(referencia)}`,
      { withCredentials: true },
    );
  }

  /** Documentos de la radicación: cotización, contrato, CTL y los cargados. */
  obtenerDocumentosSolicitud(referencia: string): Observable<readonly DocumentoSolicitud[]> {
    return this.http.get<readonly DocumentoSolicitud[]>(
      `${this.baseUrl}/solicitudes/${encodeURIComponent(referencia)}/documentos`,
      { withCredentials: true },
    );
  }

  /** Archivo de un documento de la radicación (PDF o imagen) para la vista previa; la cookie viaja con la petición. */
  descargarDocumentoSolicitud(referencia: string, documento: DocumentoSolicitud): Observable<Blob> {
    const ref = encodeURIComponent(referencia);
    const url =
      documento.tipo === 'cotizacion'
        ? `${this.baseUrl}/cotizaciones/${encodeURIComponent(documento.referencia ?? '')}/pdf`
        : documento.tipo === 'contrato'
          ? `${this.baseUrl}/contratos/${encodeURIComponent(documento.referencia ?? '')}/documento?formato=pdf`
          : documento.tipo === 'cuenta_cobro'
            ? `${this.baseUrl}/comisiones/cuentas/${encodeURIComponent(documento.referencia ?? '')}/pdf`
            : `${this.baseUrl}/solicitudes/${ref}/documentos/${encodeURIComponent(documento.clave)}`;
    return this.http.get(url, { withCredentials: true, responseType: 'blob' });
  }
}
