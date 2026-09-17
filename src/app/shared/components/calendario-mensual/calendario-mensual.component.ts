import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import {
  BadgeEstadoComponent,
  VarianteBadge,
} from '../badge-estado/badge-estado.component';

/** Evento del calendario asociado a un día concreto (Req 33.1, 33.2). */
export interface EventoCalendario {
  /** Fecha del evento en formato ISO-8601 (`YYYY-MM-DD`). */
  readonly fecha: string;
  readonly titulo: string;
  /** Variante de insignia de estado del evento (Req 33.2). */
  readonly estado: VarianteBadge;
}

/** Celda de día renderizada en la rejilla del calendario. */
interface CeldaDia {
  /** Número de día del mes; `null` para celdas de relleno. */
  readonly dia: number | null;
  /** Fecha ISO del día (`YYYY-MM-DD`); vacío para celdas de relleno. */
  readonly fechaIso: string;
  /** Indica si el día tiene al menos un evento (día resaltado). */
  readonly tieneEvento: boolean;
}

/** Nombres cortos de los días de la semana (lunes a domingo). */
const DIAS_SEMANA: readonly string[] = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** Nombres de los meses en español (0-indexado). */
const MESES: readonly string[] = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

/**
 * CalendarioMensualComponent — Componente_Compartido de calendario mensual
 * (Req 33.1, 33.2, 24.1).
 *
 * Encapsula `calendar-wrapper` / `cal-grid` / `cal-day` del prototipo, totalmente
 * tokenizado. Resalta los días que tienen eventos y muestra la lista de eventos
 * del día seleccionado; cada evento se acompaña de una insignia de estado
 * (`BadgeEstadoComponent`) según Design_Token (Req 33.2).
 *
 * Recibe el año, el mes (1–12) y la lista de eventos por `@Input()`. La rejilla
 * comienza en lunes.
 *
 * Accesibilidad: los días con eventos son botones operables por teclado con
 * foco visible y etiqueta accesible (Req 27.1, 27.5).
 */
@Component({
  selector: 'app-calendario-mensual',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeEstadoComponent],
  templateUrl: './calendario-mensual.component.html',
  styleUrl: './calendario-mensual.component.scss',
})
export class CalendarioMensualComponent implements OnChanges {
  /** Año a mostrar (por ejemplo, 2026). */
  @Input() anio: number = new Date().getFullYear();

  /** Mes a mostrar (1–12). */
  @Input() mes: number = new Date().getMonth() + 1;

  /** Eventos del mes (u otros; se filtran por día seleccionado). */
  @Input() eventos: readonly EventoCalendario[] = [];

  /** Nombres de los días de la semana (encabezado). */
  protected readonly diasSemana = DIAS_SEMANA;

  /** Celdas de la rejilla del mes (incluye relleno inicial). */
  protected celdas: readonly CeldaDia[] = [];

  /** Fecha ISO del día actualmente seleccionado. */
  protected diaSeleccionado = '';

  /** Recalcula la rejilla cuando cambian año, mes o eventos. */
  ngOnChanges(): void {
    this.celdas = this.construirCeldas();
    const primerDiaConEvento = this.celdas.find((celda) => celda.tieneEvento);
    this.diaSeleccionado = primerDiaConEvento?.fechaIso ?? '';
  }

  /** Título del mes mostrado (por ejemplo, "Octubre 2026"). */
  protected get tituloMes(): string {
    const indice = this.mes - 1;
    const nombre = MESES[indice] ?? '';
    return `${nombre} ${this.anio}`.trim();
  }

  /** Eventos del día seleccionado, en el orden recibido. */
  protected get eventosDelDia(): readonly EventoCalendario[] {
    return this.eventos.filter((evento) => evento.fecha === this.diaSeleccionado);
  }

  /** Selecciona un día para mostrar sus eventos. */
  protected seleccionarDia(celda: CeldaDia): void {
    if (celda.dia === null) {
      return;
    }
    this.diaSeleccionado = celda.fechaIso;
  }

  /** trackBy de celdas para render eficiente. */
  protected trackCelda(indice: number): number {
    return indice;
  }

  /** trackBy de eventos para render eficiente. */
  protected trackEvento(indice: number, evento: EventoCalendario): string {
    return `${evento.fecha}-${indice}`;
  }

  /**
   * Construye las celdas del mes con relleno inicial (semana iniciando en
   * lunes) y marca los días que tienen eventos.
   */
  private construirCeldas(): readonly CeldaDia[] {
    const diasConEvento = new Set(this.eventos.map((evento) => evento.fecha));
    const primerDia = new Date(this.anio, this.mes - 1, 1);
    const totalDias = new Date(this.anio, this.mes, 0).getDate();
    // getDay(): 0=domingo … 6=sábado. Convertimos a lunes=0 … domingo=6.
    const desplazamiento = (primerDia.getDay() + 6) % 7;

    const celdas: CeldaDia[] = [];
    for (let relleno = 0; relleno < desplazamiento; relleno += 1) {
      celdas.push({ dia: null, fechaIso: '', tieneEvento: false });
    }
    for (let dia = 1; dia <= totalDias; dia += 1) {
      const fechaIso = this.formatearFechaIso(this.anio, this.mes, dia);
      celdas.push({ dia, fechaIso, tieneEvento: diasConEvento.has(fechaIso) });
    }
    return celdas;
  }

  /** Formatea año/mes/día a `YYYY-MM-DD` con relleno de ceros. */
  private formatearFechaIso(anio: number, mes: number, dia: number): string {
    const mesTexto = String(mes).padStart(2, '0');
    const diaTexto = String(dia).padStart(2, '0');
    return `${anio}-${mesTexto}-${diaTexto}`;
  }
}
