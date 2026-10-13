import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { CuentaCobroResponse } from '../models/comisiones.model';
import type {
  BrokerConsola,
  ComercialConsola,
  CredencialGenerada,
  DetalleNegocioConsola,
  ExpedienteProspecto,
  Movimiento,
  NegocioConsola,
  PagoRequest,
  PersonaRequest,
  PolizaConsola,
  ProspectoConsola,
  ReferidoConsola,
  RenovacionConsola,
  ResumenConsola,
} from '../models/consola.model';

/** Consola operable del área (`/api/v1/admin/consola/*`). */
@Injectable({ providedIn: 'root' })
export class ConsolaService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/admin/consola';
  private readonly opciones = { withCredentials: true } as const;

  resumen(): Observable<ResumenConsola> {
    return this.http.get<ResumenConsola>(`${this.base}/resumen`, this.opciones);
  }

  movimientos(limite = 50): Observable<readonly Movimiento[]> {
    return this.http.get<Movimiento[]>(`${this.base}/movimientos?limite=${limite}`, this.opciones);
  }

  brokers(): Observable<readonly BrokerConsola[]> {
    return this.http.get<BrokerConsola[]>(`${this.base}/brokers`, this.opciones);
  }

  prospectos(): Observable<readonly ProspectoConsola[]> {
    return this.http.get<ProspectoConsola[]>(`${this.base}/prospectos`, this.opciones);
  }

  expediente(id: string): Observable<ExpedienteProspecto> {
    return this.http.get<ExpedienteProspecto>(`${this.base}/prospectos/${encodeURIComponent(id)}/expediente`, this.opciones);
  }

  archivoProspecto(id: string, archivoId: string): Observable<Blob> {
    return this.http.get(`${this.base}/prospectos/${encodeURIComponent(id)}/archivos/${encodeURIComponent(archivoId)}`, {
      ...this.opciones,
      responseType: 'blob',
    });
  }

  crearProspecto(datos: PersonaRequest): Observable<{ id: string; credencial: CredencialGenerada }> {
    return this.http.post<{ id: string; credencial: CredencialGenerada }>(`${this.base}/prospectos`, datos, this.opciones);
  }

  aprobarProspecto(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/prospectos/${encodeURIComponent(id)}/aprobar`, {}, this.opciones);
  }

  consultarSarlaftProspecto(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/prospectos/${encodeURIComponent(id)}/sarlaft`, {}, this.opciones);
  }

  rechazarProspecto(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/prospectos/${encodeURIComponent(id)}/rechazar`, {}, this.opciones);
  }

  comerciales(): Observable<readonly ComercialConsola[]> {
    return this.http.get<ComercialConsola[]>(`${this.base}/comerciales`, this.opciones);
  }

  crearComercial(datos: PersonaRequest): Observable<{ codigo: string; credencial: CredencialGenerada }> {
    return this.http.post<{ codigo: string; credencial: CredencialGenerada }>(`${this.base}/comerciales`, datos, this.opciones);
  }

  actualizarComercial(codigo: string, datos: Omit<PersonaRequest, 'documento'>): Observable<void> {
    return this.http.put<void>(`${this.base}/comerciales/${encodeURIComponent(codigo)}`, datos, this.opciones);
  }

  activarComercial(codigo: string, activo: boolean): Observable<void> {
    return this.http.patch<void>(`${this.base}/comerciales/${encodeURIComponent(codigo)}/activo`, { activo }, this.opciones);
  }

  restablecerAccesoComercial(codigo: string): Observable<CredencialGenerada> {
    return this.http.post<CredencialGenerada>(`${this.base}/comerciales/${encodeURIComponent(codigo)}/credencial`, {}, this.opciones);
  }

  negocios(): Observable<readonly NegocioConsola[]> {
    return this.http.get<NegocioConsola[]>(`${this.base}/negocios`, this.opciones);
  }

  negocio(radicado: string): Observable<DetalleNegocioConsola> {
    return this.http.get<DetalleNegocioConsola>(`${this.base}/negocios/${encodeURIComponent(radicado)}`, this.opciones);
  }

  polizas(): Observable<readonly PolizaConsola[]> {
    return this.http.get<PolizaConsola[]>(`${this.base}/polizas`, this.opciones);
  }

  actividadBroker(id: string): Observable<readonly Movimiento[]> {
    return this.http.get<Movimiento[]>(`${this.base}/brokers/${encodeURIComponent(id)}/actividad`, this.opciones);
  }

  documentoPoliza(numero: string): Observable<Blob> {
    return this.http.get(`${this.base}/polizas/${encodeURIComponent(numero)}/pdf`, { ...this.opciones, responseType: 'blob' });
  }

  referidos(): Observable<readonly ReferidoConsola[]> {
    return this.http.get<ReferidoConsola[]>(`${this.base}/referidos`, this.opciones);
  }

  cambiarEstadoReferido(radicado: string, estado: string, nota?: string): Observable<void> {
    return this.http.patch<void>(`${this.base}/referidos/${encodeURIComponent(radicado)}/estado`,
      { estado, nota: nota?.trim() || undefined }, this.opciones);
  }

  renovaciones(): Observable<readonly RenovacionConsola[]> {
    return this.http.get<RenovacionConsola[]>(`${this.base}/renovaciones`, this.opciones);
  }

  ingerirRenovaciones(muestra = 200): Observable<{ renovaciones: number }> {
    return this.http.post<{ renovaciones: number }>(`${this.base}/renovaciones/ingesta?muestra=${muestra}`, {}, this.opciones);
  }

  registrarPago(cuentaId: string, pago: PagoRequest): Observable<CuentaCobroResponse> {
    return this.http.patch<CuentaCobroResponse>(`/api/v1/admin/cuentasCobro/${encodeURIComponent(cuentaId)}/pago`, pago, this.opciones);
  }
}
