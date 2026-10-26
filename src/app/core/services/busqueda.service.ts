import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';

import { SessionService } from './session.service';

export type TipoResultado = 'CONTRATO' | 'COTIZACION' | 'RADICACION' | 'POLIZA' | 'CUENTA_COBRO';

/** Resultado del buscador global (`GET /dashboard/busqueda`). */
export interface ResultadoBusqueda {
  readonly tipo: TipoResultado;
  readonly referencia: string | null;
  readonly titulo: string;
  readonly detalle: string | null;
  /** Radicación asociada (un contrato o una cotización que ya se radicó). */
  readonly radicado: string | null;
}

export const ETIQUETA_TIPO: Readonly<Record<TipoResultado, string>> = {
  RADICACION: 'Radicación',
  POLIZA: 'Póliza',
  COTIZACION: 'Cotización',
  CONTRATO: 'Contrato',
  CUENTA_COBRO: 'Cuenta de cobro',
};

/**
 * Buscador de la barra superior (Ctrl+K) para todos los perfiles: el servidor aplica el alcance de la sesión
 * (broker: lo suyo; comercial: su cartera; administrador: todo) y aquí se decide a qué vista lleva cada resultado.
 */
@Injectable({ providedIn: 'root' })
export class BusquedaService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);

  static readonly MINIMO = 3;

  buscar(texto: string): Observable<readonly ResultadoBusqueda[]> {
    const q = texto.trim();
    if (q.length < BusquedaService.MINIMO) return of([]);
    return this.http.get<ResultadoBusqueda[]>('/api/v1/dashboard/busqueda', { params: { q }, withCredentials: true });
  }

  /** Vista y búsqueda con que se abre el resultado (lo radicado se ve en el seguimiento de la radicación). */
  destino(r: ResultadoBusqueda): { ruta: string; q: string } {
    const rol = this.session.perfil()?.rol;
    const interno = rol === 'ADMINISTRADOR' || rol === 'COMERCIAL';
    const q = r.radicado ?? r.referencia ?? '';
    if (r.tipo === 'POLIZA') return { ruta: interno ? '/admin/renovaciones' : '/app/renovaciones', q };
    if (r.tipo === 'CUENTA_COBRO') return { ruta: interno ? '/admin/comisiones' : '/app/comisiones', q };
    // Contrato o cotización sin radicar: se abre en el historial de Documentos con su vista previa.
    if (!r.radicado && (r.tipo === 'CONTRATO' || r.tipo === 'COTIZACION')) {
      return { ruta: interno ? '/admin/documentos' : '/app/documentos', q: r.referencia ?? '' };
    }
    if (interno) return { ruta: '/admin/negocios', q };
    return { ruta: '/app/seguimiento', q };
  }
}
