import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Categoría de recursos descargables de la Seccion_Documentos (Req 33.4).
 */
export type CategoriaRecurso =
  | 'formatos-renovacion'
  | 'cumplimiento'
  | 'contratos'
  | 'condiciones'
  | 'instructivos';

/**
 * Recurso descargable de la Seccion_Documentos (Req 33.4).
 */
export interface RecursoDescargable {
  readonly id: string;
  readonly nombre: string;
  readonly descripcion: string;
  readonly categoria: CategoriaRecurso;
  /** Nombre del Material Symbol. */
  readonly icono: string;
  readonly url: string;
}

/**
 * Evento o vencimiento de la Seccion_Calendario (Req 33.1, 33.2).
 */
export interface EventoCalendario {
  readonly titulo: string;
  readonly fecha: string; // ISO-8601
  readonly estado: string;
}

/**
 * Servicio de las secciones Documentos, Calendario y Ayuda (Req 33).
 *
 * Obtiene recursos descargables y eventos del calendario desde
 * el API_Backend vía `HttpClient` con `withCredentials`.
 */
@Injectable({ providedIn: 'root' })
export class DocumentosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1';

  /**
   * Obtiene los recursos descargables de la Seccion_Documentos (Req 33.4).
   * @returns lista de recursos por categoría.
   */
  obtenerRecursos(): Observable<readonly RecursoDescargable[]> {
    return this.http.get<readonly RecursoDescargable[]>(
      `${this.baseUrl}/documentos/recursos`,
      { withCredentials: true },
    );
  }

  /**
   * Descarga un recurso institucional usando la sesión autenticada del portal.
   * @param id identificador estable devuelto por obtenerRecursos().
   */
  descargarRecurso(id: string): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/documentos/recursos/${encodeURIComponent(id)}/descarga`,
      { responseType: 'blob', withCredentials: true },
    );
  }

  /**
   * Obtiene los eventos y vencimientos del mes indicado (Req 33.1, 33.2).
   * @param mes mes consultado (formato `YYYY-MM`).
   * @returns eventos del calendario del mes.
   */
  obtenerEventos(mes: string): Observable<readonly EventoCalendario[]> {
    const params = new HttpParams().set('mes', mes);
    return this.http.get<readonly EventoCalendario[]>(
      `${this.baseUrl}/calendario/eventos`,
      { params, withCredentials: true },
    );
  }
}
