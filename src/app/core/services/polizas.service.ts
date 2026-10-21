import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Poliza } from '../models/poliza.model';

/**
 * Servicio de consulta de Pólizas por cédula del cliente (Req 16).
 *
 * Obtiene las pólizas asociadas a un documento desde el API_Backend vía `HttpClient`
 * con `withCredentials`. Los datos llegan con la PII enmascarada (Req 28.4).
 */
@Injectable({ providedIn: 'root' })
export class PolizasService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/polizas';

  /**
   * Consulta las pólizas del cliente por su documento (Req 16.1, 16.2).
   * @param documento cédula/NIT del propietario.
   * @returns lista de pólizas del cliente.
   */
  consultarPorDocumento(documento: string): Observable<readonly Poliza[]> {
    // Sin documento devuelve todo el portafolio de la cuenta (lista inicial de la consulta).
    const params = documento ? new HttpParams().set('documento', documento) : new HttpParams();
    return this.http.get<readonly Poliza[]>(this.baseUrl, {
      params,
      withCredentials: true,
    });
  }
}
