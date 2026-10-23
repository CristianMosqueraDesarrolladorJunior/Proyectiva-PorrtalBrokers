import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, timeout } from 'rxjs';

import { EventoTemporal, validarEvento } from '../models/evento-temporal.model';
import type { ComisionDia } from '../../shared/components/comisiones-mes/comisiones-mes.component';

/**
 * Cliente de `GET /api/v1/calendario/eventos?mes=yyyy-MM`. Envía solo el rango (la cuenta sale de la sesión
 * httpOnly) y rechaza toda respuesta que no cumpla el contrato.
 */
@Injectable({ providedIn: 'root' })
export class CalendarioService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1';

  /** @param mes mes consultado (`yyyy-MM`) */
  eventosDelMes(mes: string): Observable<readonly EventoTemporal[]> {
    return this.http
      .get<unknown>(`${this.baseUrl}/calendario/eventos`, {
        params: new HttpParams().set('mes', mes),
        withCredentials: true,
      })
      .pipe(
        timeout(15_000),
        map((eventos) => {
          if (!Array.isArray(eventos)) throw new Error('Respuesta de calendario no conforme');
          return eventos.map(validarEvento);
        }),
      );
  }

  /** Plata por día del mes (inicio de vigencia) de las pólizas del broker: `GET /calendario/comisiones?mes=yyyy-MM`. */
  comisionesDelMes(mes: string): Observable<readonly ComisionDia[]> {
    return this.http
      .get<ComisionDia[]>(`${this.baseUrl}/calendario/comisiones`, {
        params: new HttpParams().set('mes', mes),
        withCredentials: true,
      })
      .pipe(timeout(20_000));
  }
}
