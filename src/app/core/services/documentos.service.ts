import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Categoría de recursos descargables de la Seccion_Documentos (Req 33.4).
 */
export type CategoriaRecurso =
  | 'formatos'
  | 'plantillas'
  | 'clausulados'
  | 'instructivos';

/**
 * Recurso descargable de la Seccion_Documentos (Req 33.4).
 */
export interface RecursoDescargable {
  readonly id: string;
  readonly nombre: string;
  readonly categoria: CategoriaRecurso;
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
 * Contacto de la Seccion_Ayuda (Req 33.5).
 */
export interface ContactoAyuda {
  readonly canal: string;
  readonly valor: string;
}

/**
 * Pregunta frecuente de la Seccion_Ayuda (Req 33.6).
 */
export interface Faq {
  readonly pregunta: string;
  readonly respuesta: string;
}

/**
 * Contenido de la Seccion_Ayuda: contactos, PQRS y FAQs (Req 33.5, 33.6).
 */
export interface AyudaResponse {
  readonly contactos: readonly ContactoAyuda[];
  readonly pqrs: string;
  readonly faqs: readonly Faq[];
}

/**
 * Servicio de las secciones Documentos, Calendario y Ayuda (Req 33).
 *
 * Obtiene recursos descargables, eventos del calendario y contenido de ayuda desde
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

  /**
   * Obtiene las FAQs y contactos de la Seccion_Ayuda (Req 33.5, 33.6).
   * @returns contactos, PQRS y preguntas frecuentes.
   */
  obtenerAyuda(): Observable<AyudaResponse> {
    return this.http.get<AyudaResponse>(`${this.baseUrl}/ayuda/faqs`, {
      withCredentials: true,
    });
  }
}
