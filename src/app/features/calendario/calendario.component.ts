import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import type { Poliza } from '../../core/models/poliza.model';
import { RenovacionService } from '../../core/services/renovacion.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

type ColorDot = 'red' | 'orange' | 'blue';

interface DiaCalendario {
  readonly numero: number | null; // null = celda vacía
  readonly fecha?: string; // yyyy-mm-dd
  readonly hoy?: boolean;
  readonly dots?: readonly ColorDot[];
}

/** Días hasta el vencimiento que se consideran urgentes / próximos. */
const DIAS_URGENTE = 7;
const DIAS_PROXIMO = 30;

/** Fecha local yyyy-mm-dd (sin desfase UTC). */
function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Calendario de vencimientos del broker (Req 33.1, 33.2): las fechas de vencimiento de SUS pólizas (portafolio real
 * de `/renovaciones/portafolio`). Rojo = vence en 7 días o menos, naranja = en 30 días o menos, azul = más adelante.
 */
@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './calendario.component.html',
  styleUrl: './calendario.component.scss',
})
export class CalendarioComponent {
  private readonly router = inject(Router);

  protected readonly diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  private readonly hoy = iso(new Date());

  /** Primer día del mes mostrado. */
  protected readonly mes = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  protected readonly polizas = signal<readonly Poliza[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal(false);
  protected readonly diaSeleccionado = signal<string | null>(null);

  protected readonly mesTitulo = computed(() => {
    const t = this.mes().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  });

  constructor() {
    inject(RenovacionService)
      .portafolio()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (p) => {
          this.polizas.set(p.polizas.filter((x) => !!x.fechaVencimiento));
          this.cargando.set(false);
        },
        error: () => {
          this.error.set(true);
          this.cargando.set(false);
        },
      });
  }

  private diasHasta(fecha: string): number {
    const [y, m, d] = fecha.slice(0, 10).split('-').map(Number);
    const hoy = new Date();
    return Math.round((new Date(y, m - 1, d).getTime() - new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime()) / 86_400_000);
  }

  private color(fecha: string): ColorDot {
    const dias = this.diasHasta(fecha);
    return dias <= DIAS_URGENTE ? 'red' : dias <= DIAS_PROXIMO ? 'orange' : 'blue';
  }

  protected readonly dias = computed<readonly DiaCalendario[]>(() => {
    const inicio = this.mes();
    const porDia = new Map<string, ColorDot[]>();
    for (const p of this.polizas()) {
      const f = p.fechaVencimiento.slice(0, 10);
      const lista = porDia.get(f) ?? [];
      const c = this.color(f);
      if (!lista.includes(c)) lista.push(c);
      porDia.set(f, lista);
    }
    const vacias = (inicio.getDay() + 6) % 7; // lunes primero
    const total = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0).getDate();
    const dias: DiaCalendario[] = Array.from({ length: vacias }, () => ({ numero: null }));
    for (let d = 1; d <= total; d++) {
      const fecha = iso(new Date(inicio.getFullYear(), inicio.getMonth(), d));
      dias.push({ numero: d, fecha, hoy: fecha === this.hoy, ...(porDia.has(fecha) ? { dots: porDia.get(fecha) } : {}) });
    }
    while (dias.length % 7 !== 0) dias.push({ numero: null });
    return dias;
  });

  /** Vencimientos del día elegido o, sin selección, los de los próximos 30 días. */
  protected readonly eventos = computed(() => {
    const dia = this.diaSeleccionado();
    return this.polizas()
      .filter((p) => {
        const f = p.fechaVencimiento.slice(0, 10);
        if (dia) return f === dia;
        const n = this.diasHasta(f);
        return n >= 0 && n <= DIAS_PROXIMO;
      })
      .sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento))
      .map((p) => {
        const n = this.diasHasta(p.fechaVencimiento);
        const urgente = n <= DIAS_URGENTE;
        return {
          numero: p.numero,
          cliente: p.cliente || `Póliza ${p.numero}`,
          detalle: `${p.producto || 'Arrendamiento'} · Póliza ${p.numero}${p.gestion ? ' · ' + p.gestion : ''}`,
          badge: n < 0 ? 'Vencida' : urgente ? 'Urgente' : 'Próxima',
          variante: n < 0 || urgente ? 'danger' : 'warning',
          urgente: n < 0 || urgente,
          vence: n < 0 ? `Venció hace ${-n} días` : n === 0 ? 'Vence hoy' : `Vence en ${n} días`,
        };
      });
  });

  protected readonly tituloEventos = computed(() => {
    const dia = this.diaSeleccionado();
    if (!dia) return 'Vencimientos de los próximos 30 días';
    const [y, m, d] = dia.split('-').map(Number);
    return 'Vencimientos del ' + new Date(y, m - 1, d).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
  });

  protected cambiarMes(delta: number): void {
    const m = this.mes();
    this.mes.set(new Date(m.getFullYear(), m.getMonth() + delta, 1));
    this.diaSeleccionado.set(null);
  }

  protected seleccionarDia(dia: DiaCalendario): void {
    if (!dia.fecha) return;
    this.diaSeleccionado.set(this.diaSeleccionado() === dia.fecha ? null : dia.fecha);
  }

  protected gestionar(): void {
    void this.router.navigate(['/app/renovaciones']);
  }
}
