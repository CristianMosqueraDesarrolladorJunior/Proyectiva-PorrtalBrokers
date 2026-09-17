import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';

/** Fila de detalle etiqueta/valor del Drawer_Detalle (Req 39.2). */
export interface FilaDetalle {
  readonly etiqueta: string;
  readonly valor: string;
}

/**
 * DrawerDetalleComponent — Componente_Compartido de panel lateral deslizante
 * (Req 35.19, 39.2, 39.3, 24.1).
 *
 * Encapsula `drawer-overlay`, `drawer`, `drawer-header`, `drawer-body`,
 * `detail-row`, `detail-label` y `drawer-footer` del prototipo, totalmente
 * tokenizado. Se muestra/oculta con `[abierto]` y emite `cerrar` al pulsar el
 * overlay, el botón de cierre o la tecla Escape (Req 34.3).
 *
 * Puede recibir filas de detalle por `@Input()` y/o proyectar contenido
 * adicional (por ejemplo, un TimelineComponent) mediante `<ng-content>`.
 *
 * Accesibilidad: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` al
 * título, foco atrapado dentro del drawer y foco visible (Req 27.1, 27.3, 39.3).
 */
@Component({
  selector: 'app-drawer-detalle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './drawer-detalle.component.html',
  styleUrl: './drawer-detalle.component.scss',
})
export class DrawerDetalleComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Controla la visibilidad del drawer. */
  @Input() abierto = false;

  /** Título mostrado en el encabezado del drawer. */
  @Input() titulo = 'Detalle';

  /** Filas etiqueta/valor a renderizar en el cuerpo del drawer. */
  @Input() filas: readonly FilaDetalle[] = [];

  /** Emite cuando el usuario solicita cerrar el drawer. */
  @Output() cerrar = new EventEmitter<void>();

  /** Selector de elementos enfocables para el atrapado de foco. */
  private static readonly SELECTOR_ENFOCABLE =
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

  /** Solicita el cierre del drawer (overlay o botón). */
  protected solicitarCierre(): void {
    this.cerrar.emit();
  }

  /** Maneja Escape (cierra) y Tab (atrapa el foco dentro del drawer). */
  protected onKeydown(evento: KeyboardEvent): void {
    if (!this.abierto) {
      return;
    }
    if (evento.key === 'Escape') {
      evento.preventDefault();
      this.solicitarCierre();
      return;
    }
    if (evento.key === 'Tab') {
      this.atraparFoco(evento);
    }
  }

  /** trackBy de filas para render eficiente. */
  protected trackFila(indice: number): number {
    return indice;
  }

  /** Mantiene el foco dentro del drawer al tabular (foco atrapado). */
  private atraparFoco(evento: KeyboardEvent): void {
    const panel = this.host.nativeElement.querySelector<HTMLElement>('.drawer');
    if (!panel) {
      return;
    }
    const enfocables = Array.from(
      panel.querySelectorAll<HTMLElement>(DrawerDetalleComponent.SELECTOR_ENFOCABLE),
    ).filter((elemento) => elemento.offsetParent !== null);
    if (enfocables.length === 0) {
      return;
    }
    const primero = enfocables[0];
    const ultimo = enfocables[enfocables.length - 1];
    const activo = panel.ownerDocument.activeElement;
    if (evento.shiftKey && activo === primero) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && activo === ultimo) {
      evento.preventDefault();
      primero.focus();
    }
  }
}
