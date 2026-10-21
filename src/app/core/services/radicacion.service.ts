import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  ConsultaSarlaftRadicacionRequest,
  RadicacionRequest,
  ResultadoEstudioArrendamiento,
  ResultadoSarlaftRadicacion,
  TipoDocumentoIdentidad,
} from '../models/radicacion.model';

/**
 * Confirmación de una Radicacion registrada (Req 10, 11).
 */
export interface RadicacionResponse {
  readonly radicado: string;
  readonly estado: string;
}

/** Documento que el área pidió corregir (col BB del Consolidado). */
export interface CorreccionArea {
  readonly documento: string;
  readonly observacion: string;
}

/** Procedimiento de la solicitud tal como lo lleva el área en el Warehouse. */
export interface Procedimiento {
  readonly codigo: string;
  readonly estadoPortal: string;
  readonly estadoWarehouse: string | null;
  readonly etiqueta: string;
  readonly requiereAccion: boolean;
  readonly correcciones: readonly CorreccionArea[];
  readonly observacion: string | null;
  readonly numeroPoliza: string | null;
  readonly asesor: string | null;
  readonly enviada: boolean;
  readonly documentosRequeridos: readonly string[];
  readonly documentos: readonly { tipo: string; archivoId: string; nombre: string; fecha: string }[];
}

export interface EventoProcedimiento {
  readonly fecha: string;
  readonly descripcion: string;
}

export interface ProcedimientoResponse {
  readonly procedimiento: Procedimiento;
  readonly eventos: readonly EventoProcedimiento[];
}

/**
 * Servicio de Radicacion de póliza (Req 10, 11, 12).
 *
 * Registra la radicación con sus documentos en el API_Backend, que revalida tipo,
 * formato y presencia (Req 10.5, 13.5). Consumo vía `HttpClient` con `withCredentials`.
 */
/** Lo que no coincide entre estudio, contrato y cotización, con los dos cánones para elegir cuál se radica. */
export interface NovedadesRadicacion {
  readonly novedades: readonly string[];
  readonly canonContrato: number | null;
  readonly canonCotizado: number | null;
}

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

  /** Sube un documento de la radicación (el backend valida tipo por contenido y tamaño). */
  subirDocumento(codigo: string, tipo: string, archivo: File): Observable<unknown> {
    const datos = new FormData();
    datos.append('tipo', tipo);
    datos.append('archivo', archivo);
    return this.http.post(`${this.baseUrl}/${encodeURIComponent(codigo)}/documentos`, datos, { withCredentials: true });
  }

  /** Envía la solicitud al área: queda en el Warehouse en "Pendiente Validación Documental". */
  enviarAlArea(codigo: string): Observable<ProcedimientoResponse> {
    return this.http.post<ProcedimientoResponse>(`${this.baseUrl}/${encodeURIComponent(codigo)}/envio`, {}, { withCredentials: true });
  }

  /** Reenvía la corrección pedida por el área (los documentos corregidos ya se subieron). */
  reenviarCorreccion(codigo: string): Observable<ProcedimientoResponse> {
    return this.http.post<ProcedimientoResponse>(`${this.baseUrl}/${encodeURIComponent(codigo)}/correccion`, {}, { withCredentials: true });
  }

  /** Procedimiento con su bitácora (relee el Warehouse). */
  procedimiento(codigo: string): Observable<ProcedimientoResponse> {
    return this.http.get<ProcedimientoResponse>(`${this.baseUrl}/${encodeURIComponent(codigo)}/procedimiento`, { withCredentials: true });
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
   * Consulta la API de Estudio Digital del Libertador del paso 2 (API-gate). El
   * backend consulta el estudio del inquilino por su número de estudio (consecutivo)
   * y su documento, y decide la salida: `APROBADO` permite continuar y autollena los
   * datos del inquilino e inmueble para el contrato; `NO_APROBADO` bloquea y devuelve
   * la URL de Estudio Digital; `PENDIENTE` indica que el estudio sigue en trámite.
   * El backend revalida y enmascara la PII (Req 5.3–5.6).
   * @param consecutivo número de estudio (consecutivo) a consultar.
   * @param documentoInquilino documento/cédula del inquilino del estudio.
   * @param tipoDocumento tipo de documento del inquilino (por defecto CC).
   * @returns resultado del estudio con datos de inquilino e inmueble enmascarados.
   */
  /** Diferencias entre el estudio y el contrato (inquilino, inmueble): avisan, no bloquean. */
  novedades(
    contratoReferencia: string,
    numeroEstudio: string,
    documentoInquilino: string,
    tipoDocumentoInquilino: TipoDocumentoIdentidad = 'CC',
  ): Observable<NovedadesRadicacion> {
    return this.http.get<NovedadesRadicacion>(`${this.baseUrl}/novedades`, {
      params: { contratoReferencia, numeroEstudio, documentoInquilino, tipoDocumentoInquilino },
      withCredentials: true,
    });
  }

  consultarEstudio(
    consecutivo: string,
    documentoInquilino: string,
    tipoDocumento: TipoDocumentoIdentidad = 'CC',
  ): Observable<ResultadoEstudioArrendamiento> {
    return this.http.post<ResultadoEstudioArrendamiento>(
      `${this.baseUrl}/estudio`,
      { consecutivo, documento: documentoInquilino, tipoDocumento },
      { withCredentials: true },
    );
  }
}
