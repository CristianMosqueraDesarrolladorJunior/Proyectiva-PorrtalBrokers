import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { CuentaCobroResponse } from '../models/comisiones.model';
import type { InduccionAdminResponse } from '../models/renovacion.model';
import type { BrokerAdminResponse, NegocioAdminResponse } from '../models/admin.model';
import { SessionService } from './session.service';

/**
 * Acciones de la consola que viven fuera de `/admin/consola` (`/api/v1/admin/*`): reasignar broker,
 * acuerdo de comisión, estado del negocio, cuentas de cobro e inducciones. Las lecturas de la consola
 * están en `ConsolaService`. La autorización fina (rol y cartera) la aplica el servidor con la sesión.
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly baseUrl = '/api/v1/admin';

  /** `true` si la sesión vigente es Administrador (rol en mayúsculas del backend). */
  esAdmin(): boolean {
    return this.session.perfil()?.rol === 'ADMINISTRADOR';
  }

  /** Asigna (o reasigna) un broker a un comercial; sus negocios se mueven con él (solo Administrador). */
  asignarComercial(brokerId: string, comercialId: string): Observable<BrokerAdminResponse> {
    return this.http.post<BrokerAdminResponse>(
      `${this.baseUrl}/brokers/${encodeURIComponent(brokerId)}/comercial`,
      { comercialId },
      { withCredentials: true },
    );
  }

  /** Cuentas de cobro de los brokers: todas (Administrador) o las de la cartera (Comercial). */
  listarCuentasCobro(): Observable<readonly CuentaCobroResponse[]> {
    return this.http.get<CuentaCobroResponse[]>(`${this.baseUrl}/cuentasCobro`, { withCredentials: true });
  }

  /** Inducciones de pólizas vencidas: todas (Administrador) o las de la cartera (Comercial). */
  listarInducciones(): Observable<readonly InduccionAdminResponse[]> {
    return this.http.get<InduccionAdminResponse[]>(`${this.baseUrl}/inducciones`, { withCredentials: true });
  }

  /** Estados a los que la consola puede mover el negocio (los decide el backend; vacío si lo gestiona el área). */
  siguientesEstados(radicado: string): Observable<readonly string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/negocios/${encodeURIComponent(radicado)}/estados`, {
      withCredentials: true,
    });
  }

  /** Mueve un negocio de estado (solo Administrador); al expedirlo el backend emite la póliza. */
  cambiarEstadoNegocio(radicado: string, estado: string, observacion?: string): Observable<NegocioAdminResponse> {
    return this.http.patch<NegocioAdminResponse>(
      `${this.baseUrl}/negocios/${encodeURIComponent(radicado)}/estado`,
      { estado, observacion: observacion?.trim() || undefined },
      { withCredentials: true },
    );
  }

  /** Cambia el acuerdo de comisión del broker: 20 o 25 % (solo Administrador; el backend valida). */
  cambiarComision(brokerId: string, porcentaje: number): Observable<BrokerAdminResponse> {
    return this.http.patch<BrokerAdminResponse>(
      `${this.baseUrl}/brokers/${encodeURIComponent(brokerId)}/comision`,
      { porcentaje },
      { withCredentials: true },
    );
  }
}
