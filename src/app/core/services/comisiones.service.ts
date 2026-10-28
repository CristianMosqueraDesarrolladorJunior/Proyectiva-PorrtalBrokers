import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  AcuerdoComision,
  CuentaCobroRequest,
  CuentaCobroResponse,
  PolizaExpedida,
  RevisionCuenta,
} from '../models/comisiones.model';

/**
 * Cuentas de cobro de comisiones del broker (solo cuentas REGISTRADAS; el backend responde 403 al
 * prospecto). El porcentaje y los totales los recalcula siempre el servidor.
 */
@Injectable({ providedIn: 'root' })
export class ComisionesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/comisiones';

  /** Revisión previa de la cuenta de cobro (errores, avisos y comisión calculados en el servidor). */
  revisarCuenta(request: CuentaCobroRequest): Observable<RevisionCuenta> {
    return this.http.post<RevisionCuenta>(`${this.baseUrl}/cuentas/revision`, request, { withCredentials: true });
  }

  /** Pólizas expedidas de la cuenta de la sesión con su estado de pago y fecha de emisión (libro de comisiones). */
  polizasExpedidas(): Observable<readonly PolizaExpedida[]> {
    return this.http.get<readonly PolizaExpedida[]>(`${this.baseUrl}/hoja`, { withCredentials: true });
  }

  obtenerAcuerdo(): Observable<AcuerdoComision> {
    return this.http.get<AcuerdoComision>(`${this.baseUrl}/acuerdo`, { withCredentials: true });
  }

  listarCuentas(): Observable<readonly CuentaCobroResponse[]> {
    return this.http.get<readonly CuentaCobroResponse[]>(`${this.baseUrl}/cuentas`, { withCredentials: true });
  }

  /** Genera el PDF, lo guarda y lo envía al área. */
  generarCuenta(request: CuentaCobroRequest): Observable<CuentaCobroResponse> {
    return this.http.post<CuentaCobroResponse>(`${this.baseUrl}/cuentas`, request, { withCredentials: true });
  }

  /** «Aún pendiente por cobrar»: anula la cuenta y sus pólizas vuelven a pendientes por cobrar. */
  devolverAPendiente(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/cuentas/${encodeURIComponent(id)}/pendiente`, {}, { withCredentials: true });
  }

  /** Descarga autenticada (la cookie viaja; solo el dueño o el área la obtienen). */
  descargarPdf(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/cuentas/${encodeURIComponent(id)}/pdf`, {
      withCredentials: true,
      responseType: 'blob',
    });
  }
}
