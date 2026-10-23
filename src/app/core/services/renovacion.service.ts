import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  CasoEspecialRequest,
  FormatoRenovacionRequest,
  FormatoRenovacionResponse,
  InduccionRequest,
  ConsultaSarlaftRenovacionRequest,
  NoRenovacionRequest,
  ResultadoSarlaftRenovacion,
  SolicitudRenovacionRequest,
  CorreccionRenovacionRequest,
  CondicionesRenovacion,
  CotizacionRenovacionRequest,
  PropuestaRenovacion,
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
/** Campos de texto de un multipart; omite los vacíos. */
/** SARLAFT actualizado que cargó el broker: el backend lo guarda como SARLAFT_<póliza> en la carpeta de la renovación. */
function conSarlaft(datos: FormData, archivo?: File): void {
  if (archivo) {
    datos.append('sarlaft', archivo, archivo.name);
  }
}

function formulario(campos: Readonly<Record<string, string | number | undefined>>): FormData {
  const datos = new FormData();
  for (const [clave, valor] of Object.entries(campos)) {
    if (valor !== undefined && valor !== null && String(valor).trim() !== '') {
      datos.append(clave, String(valor));
    }
  }
  return datos;
}

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

  /** Registro completo de una póliza del broker en el Warehouse (todos los campos del JSON). */
  datos(poliza: string): Observable<Readonly<Record<string, unknown>>> {
    return this.http.get<Record<string, unknown>>(`${this.baseUrl}/${encodeURIComponent(poliza)}/datos`, { withCredentials: true });
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
    const datos = formulario({ numeroPoliza: request.numeroPoliza, tipo: request.tipo, observaciones: request.observaciones });
    request.documentos.forEach((d) => datos.append('documentos', d, d.name));
    conSarlaft(datos, request.sarlaftActualizado);
    return this.http.post<RenovacionResponse>(`${this.baseUrl}/casosEspeciales`, datos, { withCredentials: true });
  }

  /** Reenvía una renovación devuelta a corrección: queda «Caso Corregido» para el analista que la pidió. */
  corregir(request: CorreccionRenovacionRequest): Observable<RenovacionResponse> {
    const datos = formulario({ numeroPoliza: request.numeroPoliza, observaciones: request.observaciones });
    request.documentos.forEach((d) => datos.append('documentos', d, d.name));
    conSarlaft(datos, request.sarlaftActualizado);
    return this.http.post<RenovacionResponse>(`${this.baseUrl}/correcciones`, datos, { withCredentials: true });
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

  /** Envía el enlace de actualización del SARLAFT al celular del asegurado (acción explícita del broker). */
  enviarEnlaceSarlaft(numeroPoliza: string): Observable<{ enviado: boolean }> {
    return this.http.post<{ enviado: boolean }>(`${this.baseUrl}/sarlaft/enlace`, { numeroPoliza }, { withCredentials: true });
  }

  /** Registra una renovación física o digital tras el SARLAFT vigente. */
  solicitar(request: SolicitudRenovacionRequest): Observable<RenovacionResponse> {
    const datos = formulario({
      numeroPoliza: request.numeroPoliza,
      tipo: request.tipo,
      modalidad: request.modalidad,
      comentarios: request.comentarios,
      fechaInicio: request.fechaInicio,
      fechaFin: request.fechaFin,
      ...request.ajustes,
    });
    if (request.formularioRenovacion) {
      datos.append('formulario', request.formularioRenovacion, request.formularioRenovacion.name);
    }
    conSarlaft(datos, request.sarlaftActualizado);
    return this.http.post<RenovacionResponse>(`${this.baseUrl}/solicitudes`, datos, { withCredentials: true });
  }

  /** Póliza que vence (col B del Warehouse) con las propuestas «anterior» y «nueva» ya cotizadas. */
  condiciones(numeroPoliza: string): Observable<CondicionesRenovacion> {
    return this.http.get<CondicionesRenovacion>(`${this.baseUrl}/${encodeURIComponent(numeroPoliza)}/condiciones`, {
      withCredentials: true,
    });
  }

  /** Recotiza la nueva vigencia con las reglas de Comercial renovaciones (las calcula el backend). */
  cotizar(numeroPoliza: string, request: CotizacionRenovacionRequest): Observable<PropuestaRenovacion> {
    return this.http.post<PropuestaRenovacion>(
      `${this.baseUrl}/${encodeURIComponent(numeroPoliza)}/cotizacion`,
      request,
      { withCredentials: true },
    );
  }

  /** Genera el formato oficial de Bolívar relleno (el backend revalida el tope IPC). */
  generarFormato(numeroPoliza: string, request: FormatoRenovacionRequest): Observable<FormatoRenovacionResponse> {
    return this.http.post<FormatoRenovacionResponse>(
      `${this.baseUrl}/${encodeURIComponent(numeroPoliza)}/formato`,
      request,
      { withCredentials: true },
    );
  }

  /** PDF del último formato generado para la póliza. */
  descargarFormato(numeroPoliza: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${encodeURIComponent(numeroPoliza)}/formato/pdf`, {
      withCredentials: true,
      responseType: 'blob',
    });
  }

  /** Envía la inducción de una póliza vencida (multipart: datos + contrato + paz y salvo). */
  enviarInduccion(
    numeroPoliza: string,
    datos: InduccionRequest,
    contrato: File,
    pazYSalvo: File,
  ): Observable<RenovacionResponse> {
    const cuerpo = new FormData();
    cuerpo.append('datos', new Blob([JSON.stringify(datos)], { type: 'application/json' }));
    cuerpo.append('contrato', contrato);
    cuerpo.append('pazYSalvo', pazYSalvo);
    return this.http.post<RenovacionResponse>(
      `${this.baseUrl}/${encodeURIComponent(numeroPoliza)}/induccion`,
      cuerpo,
      { withCredentials: true },
    );
  }

  /** Contrato o paz y salvo de una inducción (dueño o área). */
  descargarArchivoInduccion(id: string, documento: 'contrato' | 'pazYSalvo'): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/inducciones/${encodeURIComponent(id)}/${documento}`, {
      withCredentials: true,
      responseType: 'blob',
    });
  }
}
