import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type TipoSoporte = 'PREVENTIVO' | 'CORRECTIVO';
export type AreaSoporte = 'COTIZACION' | 'CONTRATOS' | 'POLIZA' | 'REFERIDOS' | 'RENOVACIONES' | 'COMISIONES';

/** Áreas del portal sobre las que se pide soporte (código del backend, etiqueta e icono para la pantalla). */
export const AREAS_SOPORTE: readonly { valor: AreaSoporte; etiqueta: string; icono: string }[] = [
  { valor: 'COTIZACION', etiqueta: 'Cotización', icono: 'request_quote' },
  { valor: 'CONTRATOS', etiqueta: 'Elaboración de contratos', icono: 'history_edu' },
  { valor: 'POLIZA', etiqueta: 'Solicitar una póliza', icono: 'verified_user' },
  { valor: 'REFERIDOS', etiqueta: 'Referidos', icono: 'share' },
  { valor: 'RENOVACIONES', etiqueta: 'Renovaciones', icono: 'autorenew' },
  { valor: 'COMISIONES', etiqueta: 'Comisiones', icono: 'receipt_long' },
];

/** Etiquetas de las áreas, separadas por coma, para tablas. */
export function areasTexto(areas: readonly string[]): string {
  return areas.map((a) => AREAS_SOPORTE.find((x) => x.valor === a)?.etiqueta ?? a).join(', ');
}

export type EstadoSoporte = 'PENDIENTE' | 'SOLVENTADO';

export interface SoporteRequest {
  readonly tipo: TipoSoporte;
  readonly areas: readonly AreaSoporte[];
  readonly asunto: string;
  readonly observacion: string;
}

export interface SolicitudSoporte {
  readonly ticket: string;
  readonly estadoCuenta: string;
  readonly brokerDocumento: string;
  readonly brokerNombre: string;
  readonly brokerTelefono: string | null;
  readonly brokerCorreo: string | null;
  readonly tipo: TipoSoporte;
  readonly areas: readonly AreaSoporte[];
  readonly asunto: string;
  readonly observacion: string;
  readonly estado: EstadoSoporte;
  readonly creadoEn: string;
  readonly solventadoEn: string | null;
  readonly solventadoPor: string | null;
}

export interface ListadoSoporte {
  readonly metaHoras: number;
  readonly solicitudes: readonly SolicitudSoporte[];
}

/** Soporte a brokers: el broker radica y ve su tracking; la consola gestiona el estado. */
@Injectable({ providedIn: 'root' })
export class SoporteService {
  private readonly http = inject(HttpClient);

  crear(request: SoporteRequest): Observable<SolicitudSoporte> {
    return this.http.post<SolicitudSoporte>('/api/v1/ayuda/soporte', request, { withCredentials: true });
  }

  mias(): Observable<ListadoSoporte> {
    return this.http.get<ListadoSoporte>('/api/v1/ayuda/soporte', { withCredentials: true });
  }

  consola(): Observable<ListadoSoporte> {
    return this.http.get<ListadoSoporte>('/api/v1/admin/soporte', { withCredentials: true });
  }

  cambiarEstado(ticket: string, estado: EstadoSoporte): Observable<SolicitudSoporte> {
    return this.http.patch<SolicitudSoporte>(
      `/api/v1/admin/soporte/${encodeURIComponent(ticket)}/estado`,
      { estado },
      { withCredentials: true },
    );
  }
}

/** Texto del temporizador: «3 h 20 min» (o «2 d 4 h»). Pura, para probarla sin reloj. */
export function duracionTexto(desde: string, hasta: number | string): string {
  const min = Math.max(0, Math.floor((new Date(hasta).getTime() - new Date(desde).getTime()) / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return h < 48 ? `${h} h ${min % 60} min` : `${Math.floor(h / 24)} d ${h % 24} h`;
}

/** Una solicitud abierta vence cuando supera la meta de atención; las solventadas ya no vencen. */
export function vencida(s: Pick<SolicitudSoporte, 'estado' | 'creadoEn'>, ahora: number, metaHoras: number): boolean {
  return s.estado === 'PENDIENTE' && ahora - new Date(s.creadoEn).getTime() > metaHoras * 3600000;
}
