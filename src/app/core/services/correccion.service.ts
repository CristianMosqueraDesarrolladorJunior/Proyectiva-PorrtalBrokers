import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Solicitud de Correccion_Documento con el documento corregido y observaciones (Req 32).
 *
 * El backend recibe la corrección como {@code multipart/form-data} (campos {@code referencia},
 * {@code archivo} y {@code observaciones}); por eso se transporta el {@link File} real del documento
 * corregido, no solo sus metadatos.
 */
export interface CorreccionRequest {
  readonly referencia: string;
  readonly archivo: File;
  readonly observaciones?: string;
}

/**
 * Confirmación de una Correccion_Documento registrada (Req 32.6).
 */
export interface CorreccionResponse {
  readonly radicado: string;
  readonly estado: string;
  readonly tiempoEstimadoRevision: string;
}

/** Respuesta cruda del backend ({@code POST /correcciones}). */
interface CorreccionResponseBackend {
  readonly radicado: string;
  readonly estado: string;
  readonly tiempoEstimadoDias: number;
}

/**
 * Servicio de Correccion_Documento (Req 32).
 *
 * Registra la corrección del documento con sus observaciones en el API_Backend vía
 * `HttpClient` con `withCredentials`, usando `multipart/form-data` para enviar el archivo
 * corregido (el backend revalida tipo MIME real, tamaño y presencia, y verifica la propiedad
 * del trámite — anti-BOLA).
 */
@Injectable({ providedIn: 'root' })
export class CorreccionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/correcciones';

  /**
   * Registra una Correccion_Documento (Req 32.6).
   * @param request referencia del trámite, documento corregido (archivo real) y observaciones.
   * @returns confirmación con radicado, estado y tiempo estimado de revisión.
   */
  registrar(request: CorreccionRequest): Observable<CorreccionResponse> {
    const formData = new FormData();
    formData.append('referencia', request.referencia);
    formData.append('archivo', request.archivo, request.archivo.name);
    if (request.observaciones && request.observaciones.trim().length > 0) {
      formData.append('observaciones', request.observaciones.trim());
    }
    return new Observable<CorreccionResponse>((subscriber) => {
      const sub = this.http
        .post<CorreccionResponseBackend>(this.baseUrl, formData, {
          withCredentials: true,
        })
        .subscribe({
          next: (respuesta) => {
            subscriber.next({
              radicado: respuesta.radicado,
              estado: respuesta.estado,
              tiempoEstimadoRevision: `${respuesta.tiempoEstimadoDias} día(s) hábiles`,
            });
            subscriber.complete();
          },
          error: (err) => subscriber.error(err),
        });
      return () => sub.unsubscribe();
    });
  }
}
