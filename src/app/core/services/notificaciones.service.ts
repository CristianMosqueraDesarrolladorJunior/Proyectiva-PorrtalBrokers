import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';

import type { Notificacion } from '../models/notificacion.model';
import { DashboardService } from './dashboard.service';
import { DocumentosService } from './documentos.service';

const CLAVE_LEIDAS = 'portal-brokers:notificaciones-leidas';
const MAXIMO_NOTIFICACIONES = 8;

/**
 * Notificaciones del bróker. No existe un endpoint dedicado: se derivan de datos
 * operativos que ya expone el API (KPIs de seguimiento y vencimientos del
 * calendario). El estado "leída" se conserva por sesión del navegador.
 */
@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private readonly dashboard = inject(DashboardService);
  private readonly documentos = inject(DocumentosService);

  private readonly base = signal<readonly Omit<Notificacion, 'leida'>[]>([]);
  private readonly leidas = signal<ReadonlySet<string>>(this.leerLeidas());

  readonly lista = computed<readonly Notificacion[]>(() =>
    this.base().map((n) => ({ ...n, leida: this.leidas().has(n.id) })),
  );

  readonly noLeidas = computed(() => this.lista().filter((n) => !n.leida).length);

  /** Carga (o refresca) las notificaciones desde el API. Los fallos no interrumpen la UI. */
  cargar(): void {
    const mes = new Date().toISOString().slice(0, 7);
    forkJoin({
      kpis: this.dashboard.obtenerKpis().pipe(catchError(() => of(null))),
      eventos: this.documentos.obtenerEventos(mes).pipe(catchError(() => of([]))),
    }).subscribe(({ kpis, eventos }) => {
      const items: Omit<Notificacion, 'leida'>[] = [];

      if (kpis && kpis.bloqueadas > 0) {
        items.push({
          id: `bloqueadas-${kpis.bloqueadas}`,
          titulo: `${kpis.bloqueadas} ${kpis.bloqueadas === 1 ? 'solicitud bloqueada' : 'solicitudes bloqueadas'}`,
          detalle: 'Falta documentación SARLAFT. Súbela para continuar con la emisión.',
          tono: 'alerta',
          ruta: '/app/seguimiento',
        });
      }
      if (kpis && kpis.enRevision > 0) {
        items.push({
          id: `revision-${kpis.enRevision}`,
          titulo: `${kpis.enRevision} ${kpis.enRevision === 1 ? 'solicitud en revisión' : 'solicitudes en revisión'}`,
          detalle: 'En mesa de suscripción. Te avisaremos cuando haya novedades.',
          tono: 'info',
          ruta: '/app/seguimiento',
        });
      }
      for (const evento of eventos) {
        items.push({
          id: `evento-${evento.fecha}-${evento.titulo}`,
          titulo: evento.titulo,
          detalle: `${evento.estado === 'urgente' ? 'Vencimiento urgente' : 'Próximo vencimiento'} · ${this.formatearFecha(evento.fecha)}`,
          tono: evento.estado === 'urgente' ? 'alerta' : 'info',
          ruta: '/app/calendario',
        });
      }
      this.base.set(items.slice(0, MAXIMO_NOTIFICACIONES));
    });
  }

  private formatearFecha(iso: string): string {
    const fecha = new Date(`${iso.slice(0, 10)}T00:00:00`);
    return Number.isNaN(fecha.getTime())
      ? iso
      : fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  marcarLeida(id: string): void {
    this.actualizarLeidas((s) => s.add(id));
  }

  marcarTodasLeidas(): void {
    this.actualizarLeidas((s) => this.base().forEach((n) => s.add(n.id)));
  }

  private actualizarLeidas(mutar: (s: Set<string>) => void): void {
    const siguiente = new Set(this.leidas());
    mutar(siguiente);
    this.leidas.set(siguiente);
    try {
      sessionStorage.setItem(CLAVE_LEIDAS, JSON.stringify([...siguiente]));
    } catch {
      /* almacenamiento no disponible: el estado vive solo en memoria */
    }
  }

  private leerLeidas(): ReadonlySet<string> {
    try {
      const crudo = sessionStorage.getItem(CLAVE_LEIDAS);
      return new Set<string>(crudo ? (JSON.parse(crudo) as string[]) : []);
    } catch {
      return new Set<string>();
    }
  }
}
