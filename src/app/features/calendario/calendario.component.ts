import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

/** Punto de color de un día del calendario (rojo urgente, naranja próxima, azul evento). */
type ColorDot = 'red' | 'orange' | 'blue';

/** Día del calendario mensual con sus puntos de evento (Req 33.1, 33.2). */
interface DiaCalendario {
  readonly numero: number | null; // null = celda vacía
  readonly hoy?: boolean;
  readonly dots?: readonly ColorDot[];
}

/** Tarjeta de evento del día seleccionado (Req 33.2). */
interface EventoCard {
  readonly urgente: boolean;
  readonly badge: string;
  readonly variante: 'danger' | 'warning';
  readonly cliente: string;
  readonly detalle: string;
  readonly vence: string;
  readonly gestionable: boolean;
}

/**
 * Seccion_Calendario (Req 33.1, 33.2).
 *
 * Replica fielmente el prototipo: `calendar-wrapper` con encabezado de mes y
 * vistas (Mes/Semana/Día), rejilla mensual con días resaltados y puntos de color,
 * leyenda (Urgente/Próxima/Evento) y `event-cards` del día seleccionado con badge
 * y acción "Gestionar" (que abre el flujo de renovación, Req 33.2).
 */
@Component({
  selector: 'app-calendario',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './calendario.component.html',
  styleUrl: './calendario.component.scss',
})
export class CalendarioComponent {
  private readonly router = inject(Router);

  /** Mes mostrado (encabezado del prototipo). */
  protected readonly mesTitulo = 'Octubre 2026';

  /** Encabezados de los días de la semana. */
  protected readonly diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  /** Vistas del calendario (solo "Mes" activa, fiel al prototipo). */
  protected readonly vistas = ['Mes', 'Semana', 'Día'];

  /** Vista activa actual. */
  protected vistaActiva = 'Mes';

  /** Días del calendario del prototipo (octubre 2026 empieza en miércoles). */
  protected readonly dias: readonly DiaCalendario[] = this.construirDias();

  /** Eventos del día seleccionado (15 de octubre, como el prototipo). */
  protected readonly eventos: readonly EventoCard[] = [
    {
      urgente: true,
      badge: 'Urgente',
      variante: 'danger',
      cliente: 'Empresas Globales S.A.',
      detalle: 'Póliza Integral · #POL-90822',
      vence: '📅 Vence en 3 días',
      gestionable: true,
    },
    {
      urgente: false,
      badge: 'Próxima',
      variante: 'warning',
      cliente: 'Marta Rodríguez P.',
      detalle: 'Seguro de Vida · #VID-44510',
      vence: '📅 Vence en 15 días',
      gestionable: false,
    },
  ];

  /** Selecciona una vista del calendario (Mes/Semana/Día). */
  protected seleccionarVista(vista: string): void {
    this.vistaActiva = vista;
  }

  /** Abre el flujo de renovación desde un evento gestionable (Req 33.2). */
  protected gestionar(): void {
    void this.router.navigate(['/app/renovaciones']);
  }

  /** trackBy de días. */
  protected trackDia(indice: number): number {
    return indice;
  }

  /** trackBy de eventos. */
  protected trackEvento(_i: number, evento: EventoCard): string {
    return evento.detalle;
  }

  /**
   * Construye la rejilla de octubre 2026 con los días y puntos del prototipo:
   * 1 celda vacía inicial (empieza miércoles), días 1–31 con eventos en 4, 12,
   * 15 (hoy), 18 y 22, y celdas vacías finales.
   */
  private construirDias(): readonly DiaCalendario[] {
    const eventos: Readonly<Record<number, readonly ColorDot[]>> = {
      4: ['red'],
      12: ['orange', 'blue'],
      15: ['red', 'orange'],
      18: ['blue'],
      22: ['red', 'orange', 'blue'],
    };
    const dias: DiaCalendario[] = [{ numero: null }]; // celda vacía inicial (miércoles)
    for (let d = 1; d <= 31; d++) {
      dias.push({
        numero: d,
        hoy: d === 15,
        ...(eventos[d] ? { dots: eventos[d] } : {}),
      });
    }
    dias.push({ numero: null }, { numero: null }, { numero: null }); // celdas finales
    return dias;
  }
}
