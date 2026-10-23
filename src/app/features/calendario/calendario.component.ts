import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import type { EventoTemporal } from '../../core/models/evento-temporal.model';
import { CalendarioService } from '../../core/services/calendario.service';
import {
  EventoCalendario,
  CalendarioMensualComponent,
} from '../../shared/components/calendario-mensual/calendario-mensual.component';
import { mensajeDeError, rutaSeguimiento } from '../../shared/components/calendario-mensual/calendario-eventos.helpers';
import type { PlataDia } from '../../shared/components/calendario-mensual/calendario-mensual.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

/** Etiqueta e insignia por tipo de evento. */
const PRESENTACION: Readonly<Record<EventoTemporal['tipoEvento'], Pick<EventoCalendario, 'estado' | 'etiqueta'>>> = {
  INICIO_CONTRATO: { estado: 'info', etiqueta: 'Contrato' },
  VENCIMIENTO_POLIZA: { estado: 'danger', etiqueta: 'Vencimiento' },
  COTIZACION_REALIZADA: { estado: 'success', etiqueta: 'Cotización' },
  RENOVACION_VENCIMIENTO: { estado: 'warning', etiqueta: 'Renovación' },
};

/**
 * Calendario de eventos temporales del broker: los eventos del mes los deriva el backend del dominio de la
 * cuenta (contratos, pólizas, cotizaciones y renovaciones). La rejilla y la lista del día las pinta
 * `app-calendario-mensual`; «Gestionar» lleva a Seguimiento solo mediante la Referencia_Origen del evento.
 */
@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [PageHeaderComponent, CalendarioMensualComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './calendario.component.html',
  styleUrl: './calendario.component.scss',
})
export class CalendarioComponent {
  private readonly router = inject(Router);
  private readonly servicio = inject(CalendarioService);

  protected readonly mes = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  protected readonly eventos = signal<readonly EventoTemporal[]>([]);
  /** Plata por día del mes (si falla, el calendario sigue: la gráfica no se muestra). */
  protected readonly comisiones = signal<readonly PlataDia[]>([]);
  protected readonly mesIso = computed(() => `${this.mes().getFullYear()}-${String(this.mes().getMonth() + 1).padStart(2, '0')}`);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly anio = computed(() => this.mes().getFullYear());
  protected readonly numeroMes = computed(() => this.mes().getMonth() + 1);

  protected readonly eventosVista = computed<readonly EventoCalendario[]>(() =>
    this.eventos().map((e) => ({
      fecha: e.fecha,
      titulo: e.descripcion,
      hora: e.hora,
      todoElDia: e.todoElDia,
      tipoEvento: e.tipoEvento,
      clasificacionTemporal: e.clasificacionTemporal,
      referenciaOrigen: e.referenciaOrigen,
      ...PRESENTACION[e.tipoEvento],
    })),
  );

  constructor() {
    this.cargar();
  }

  /** Carga los eventos del mes mostrado; ante error conserva el estado previo y ofrece reintento. */
  protected cargar(): void {
    const m = this.mes();
    this.cargando.set(true);
    this.error.set(null);
    this.comisiones.set([]);
    this.servicio.comisionesDelMes(this.mesIso()).subscribe({ next: (d) => this.comisiones.set(d), error: () => this.comisiones.set([]) });
    this.servicio.eventosDelMes(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`).subscribe({
      next: (eventos) => {
        this.eventos.set(eventos);
        this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.error.set(mensajeDeError(err));
        this.cargando.set(false);
      },
    });
  }

  protected cambiarMes(delta: number): void {
    const m = this.mes();
    this.mes.set(new Date(m.getFullYear(), m.getMonth() + delta, 1));
    this.cargar();
  }

  /** Navega a Seguimiento; una referencia irresoluble no navega. */
  protected gestionar(evento: EventoCalendario): void {
    const destino = rutaSeguimiento(evento);
    if (destino) void this.router.navigate(destino.ruta, { queryParams: destino.queryParams });
  }
}
