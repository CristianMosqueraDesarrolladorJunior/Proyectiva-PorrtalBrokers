import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Cobertura del catálogo con su monto por defecto en pasos de $500.000 (Req 14).
 */
export interface CoberturaCatalogo {
  readonly id: string;
  readonly nombre: string;
  readonly descripcion: string;
  readonly montoDefecto: number;
  readonly pasoMonto: number; // 500000
}

/**
 * Servicio del catálogo de Coberturas (Req 14).
 *
 * Obtiene el listado de coberturas disponibles desde el API_Backend vía `HttpClient`
 * con `withCredentials`.
 */
@Injectable({ providedIn: 'root' })
export class CoberturasService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/coberturas';

  /**
   * Obtiene el catálogo de coberturas disponibles (Req 14.1).
   * @returns lista de coberturas del catálogo.
   */
  listar(): Observable<readonly CoberturaCatalogo[]> {
    return this.http.get<readonly CoberturaCatalogo[]>(this.baseUrl, {
      withCredentials: true,
    });
  }
}
