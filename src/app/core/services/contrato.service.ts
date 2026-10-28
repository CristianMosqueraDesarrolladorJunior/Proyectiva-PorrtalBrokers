import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { TIEMPO_LIMITE } from '../interceptors/timeout-retry.interceptor';

import {
  ContratoArrendamientoRequest,
  LecturaContratoResponse,
  PrellenadoContrato,
  FormatoContrato,
  ValidacionCtl,
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
/** Contrato generado sin radicar (`GET /contratos/pendientes`). */
export interface ContratoPendiente {
  readonly referencia: string;
  readonly fecha: string;
  readonly propietario: string;
  readonly tipoDocumentoPropietario: string;
  readonly documentoPropietario: string;
  readonly inquilino: string;
  readonly tipoDocumentoInquilino: string;
  readonly documentoInquilino: string;
  readonly inmueble: string;
  readonly leasing: boolean;
}

@Injectable({ providedIn: 'root' })
export class ContratoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/contratos/arrendamiento';

  /**
   * Solicita la generación del Contrato_Arrendamiento (Req 30.7).
   * @param request datos de arrendador, arrendatario, inmueble y condiciones.
   * @returns confirmación con radicado y estado.
   */
  /** Valida un CTL (PDF): antigüedad máxima de 90 días y coincidencia de la dirección con la del contrato. */
  validarCtl(archivo: File, direccionContrato: string): Observable<ValidacionCtl> {
    const cuerpo = new FormData();
    cuerpo.append('archivo', archivo);
    if (direccionContrato.trim()) {
      cuerpo.append('direccionContrato', direccionContrato.trim());
    }
    // La IA lee el CTL hasta en 25 s (backend): más que el límite general de 15 s.
    return this.http.post<ValidacionCtl>('/api/v1/contratos/ctl/validacion', cuerpo, {
      withCredentials: true,
      context: new HttpContext().set(TIEMPO_LIMITE, 40_000),
    });
  }

  /** Datos del estudio digital (arrendatario, codeudores, propietario e inmueble) para precargar el contrato. */
  prellenado(consecutivo: string, documento: string, tipoDocumento: string): Observable<PrellenadoContrato> {
    const params = new HttpParams().set('consecutivo', consecutivo).set('documento', documento).set('tipoDocumento', tipoDocumento);
    return this.http.get<PrellenadoContrato>('/api/v1/contratos/prellenado', { params, withCredentials: true });
  }

  /** Contrato como archivo individual (PDF o Word) con la plantilla de vivienda o comercio que elige el backend. */
  descargarDocumento(referencia: string, formato: FormatoContrato = 'docx'): Observable<Blob> {
    return this.http.get(`/api/v1/contratos/${encodeURIComponent(referencia)}/documento`, {
      params: { formato },
      withCredentials: true,
      responseType: 'blob',
    });
  }

  /** Contratos que generó la cuenta y aún no radicó (la radicación los ofrece para no volver a empezar). */
  pendientes(): Observable<readonly ContratoPendiente[]> {
    return this.http.get<ContratoPendiente[]>('/api/v1/contratos/pendientes', { withCredentials: true });
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
    // Un contrato escaneado puede tardar hasta 60 s en la IA (backend) más la subida: no se corta a los 15 s.
    return this.http.post<LecturaContratoResponse>('/api/v1/contratos/lectura', datos, {
      withCredentials: true,
      context: new HttpContext().set(TIEMPO_LIMITE, 90_000),
    });
  }
}
