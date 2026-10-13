import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  ContratoArrendamientoRequest,
  LecturaContratoResponse,
  PrellenadoContrato,
} from '../models/contrato.model';

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
  /** Datos del estudio digital (arrendatario, codeudores, propietario e inmueble) para precargar el contrato. */
  prellenado(consecutivo: string, documento: string, tipoDocumento: string): Observable<PrellenadoContrato> {
    const params = new HttpParams().set('consecutivo', consecutivo).set('documento', documento).set('tipoDocumento', tipoDocumento);
    return this.http.get<PrellenadoContrato>('/api/v1/contratos/prellenado', { params, withCredentials: true });
  }

  /** Word del contrato con la plantilla de vivienda o comercio según el uso del inmueble (la elige el backend). */
  descargarDocumento(referencia: string): Observable<Blob> {
    return this.http.get(`/api/v1/contratos/${encodeURIComponent(referencia)}/documento`, {
      withCredentials: true,
      responseType: 'blob',
    });
  }

  generar(
    request: ContratoArrendamientoRequest,
  ): Observable<ContratoArrendamientoResponse> {
    return this.http.post<ContratoArrendamientoResponse>(this.baseUrl, request, {
      withCredentials: true,
    });
  }

  /**
   * Lee un contrato ya firmado (PDF o foto, incluso escaneado) y propone los datos de las partes.
   * El archivo va solo al backend; el portal nunca habla con el LLM.
   */
  leer(archivo: File): Observable<LecturaContratoResponse> {
    const datos = new FormData();
    datos.append('archivo', archivo, archivo.name);
    return this.http.post<LecturaContratoResponse>('/api/v1/contratos/lectura', datos, {
      withCredentials: true,
    });
  }
}
