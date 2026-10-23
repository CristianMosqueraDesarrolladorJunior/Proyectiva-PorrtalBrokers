import { copCompacto } from '../../../core/services/admin.helpers';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import type { ClasificacionTemporal, ReferenciaOrigen, TipoEvento } from '../../../core/models/evento-temporal.model';
import {
  BadgeEstadoComponent,
  VarianteBadge,
} from '../badge-estado/badge-estado.component';
import { agruparDia, esGestionable, etiquetaDia, GrupoEventos, indicadorDe } from './calendario-eventos.helpers';

/** Evento del calendario asociado a un día concreto (Req 33.1, 33.2). */
export interface EventoCalendario {
  /** Fecha del evento en formato ISO-8601 (`YYYY-MM-DD`). */
  readonly fecha: string;
  readonly titulo: string;
  /** Variante de insignia de estado del evento (Req 33.2). */
  readonly estado: VarianteBadge;
  /** Texto de la insignia; por defecto, la variante. */
  readonly etiqueta?: string;
  /** `HH:mm`; con `todoElDia` se ignora (00:00). */
  readonly hora?: string;
  readonly todoElDia?: boolean;
  readonly tipoEvento?: TipoEvento;
  /** Clasificación calculada por el backend; el estilo depende solo de ella. */
  readonly clasificacionTemporal?: ClasificacionTemporal;
  readonly referenciaOrigen?: ReferenciaOrigen;
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
/** Un día del mes por inicio de vigencia (GET /calendario/comisiones). */
export interface PlataDia {
  readonly dia: string;
  readonly total: number;
  readonly comisionNuevas: number;
  readonly comisionRenovadas: number;
  readonly totalPendiente: number;
  readonly comisionPendiente: number;
}

interface BarraDia {
  readonly dia: number;
  readonly fechaIso: string;
  readonly hTotal: number;
  readonly hRenovadas: number;
  readonly hNuevas: number;
  readonly hPendiente: number;
  readonly etiqueta: string;
}

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

  /**
   * Plata por día del mes por inicio de vigencia (opcional). Con datos, arriba de la rejilla se dibuja una barra por día:
   * el total de las pólizas y, al lado, la comisión del día (renovaciones, nuevas y pendiente por renovar).
   */
  @Input() plata: readonly PlataDia[] = [];

  /** Se emite al pulsar «Gestionar» en un evento gestionable (renovación por vencer). */
  @Output() readonly gestionar = new EventEmitter<EventoCalendario>();

  /** Nombres de los días de la semana (encabezado). */
  protected readonly diasSemana = DIAS_SEMANA;

  /** Celdas de la rejilla del mes (incluye relleno inicial). */
  protected celdas: readonly CeldaDia[] = [];

  /** Fecha ISO del día actualmente seleccionado. */
  protected diaSeleccionado = '';

  /** Barras de la gráfica: una por día del mes, con una sola escala para las dos barras. */
  protected barras: readonly BarraDia[] = [];
  protected totalesPlata = { total: 0, renovadas: 0, nuevas: 0, pendiente: 0 };
  protected readonly cop = (v: number) => copCompacto(v);

  /** Recalcula la rejilla cuando cambian año, mes o eventos. */
  ngOnChanges(): void {
    this.celdas = this.construirCeldas();
    this.barras = this.construirBarras();
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

  /** Eventos del día agrupados en Anteriores / Hoy / Próximos. */
  protected get gruposDelDia(): readonly GrupoEventos<EventoCalendario>[] {
    return agruparDia(this.eventosDelDia);
  }

  /** Hoy en AAAA-MM-DD (hora local): los días anteriores se ven atenuados para no mezclar lo que ya pasó. */
  protected readonly hoyIso = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  protected readonly indicadorDe = indicadorDe;
  protected readonly esGestionable = esGestionable;
  protected readonly etiquetaDia = etiquetaDia;

  /** Cantidad de eventos de un día (para la etiqueta accesible). */
  protected cantidadEventos(fechaIso: string): number {
    return this.eventos.filter((e) => e.fecha === fechaIso).length;
  }

  /** Selecciona un día para mostrar sus eventos. */
  protected seleccionarDia(celda: CeldaDia): void {
    if (celda.dia === null) {
      return;
    }
    this.diaSeleccionado = celda.fechaIso;
  }

  /** Al tocar la barra de un día se muestran los eventos de ese día. */
  protected seleccionarFecha(fechaIso: string): void {
    this.diaSeleccionado = fechaIso;
  }

  private construirBarras(): readonly BarraDia[] {
    const porDia = new Map(this.plata.map((p) => [p.dia.slice(0, 10), p]));
    const comision = (p: PlataDia) => p.comisionRenovadas + p.comisionNuevas + p.comisionPendiente;
    const maximo = Math.max(1, ...this.plata.map((p) => Math.max(p.total, comision(p))));
    const alto = (v: number) => (v > 0 ? Math.max(3, (v / maximo) * 100) : 0);
    this.totalesPlata = this.plata.reduce(
      (t, p) => ({ total: t.total + p.total, renovadas: t.renovadas + p.comisionRenovadas,
        nuevas: t.nuevas + p.comisionNuevas, pendiente: t.pendiente + p.comisionPendiente }),
      { total: 0, renovadas: 0, nuevas: 0, pendiente: 0 },
    );
    const totalDias = new Date(this.anio, this.mes, 0).getDate();
    return Array.from({ length: totalDias }, (_, i) => {
      const fechaIso = this.formatearFechaIso(this.anio, this.mes, i + 1);
      const p = porDia.get(fechaIso);
      return {
        dia: i + 1,
        fechaIso,
        hTotal: p ? alto(p.total) : 0,
        hRenovadas: p ? alto(p.comisionRenovadas) : 0,
        hNuevas: p ? alto(p.comisionNuevas) : 0,
        hPendiente: p ? alto(p.comisionPendiente) : 0,
        etiqueta: p
          ? `${i + 1}: pólizas ${copCompacto(p.total)} · comisión renovaciones ${copCompacto(p.comisionRenovadas)}, nuevas ${copCompacto(p.comisionNuevas)}, pendiente por renovar ${copCompacto(p.comisionPendiente)}`
          : `${i + 1}: sin pólizas que inicien vigencia`,
      };
    });
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
