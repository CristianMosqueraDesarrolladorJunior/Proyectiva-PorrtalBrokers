import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

/** Definición de una pestaña reutilizable (Req 35.11). */
export interface Tab {
  readonly id: string;
  readonly etiqueta: string;
}

/**
 * TabsComponent — Componente_Compartido de pestañas reutilizable (Req 35.11, 24.3).
 *
 * Encapsula `tabs` / `tab` del prototipo (por ejemplo, Persona Natural / Persona
 * Jurídica), totalmente tokenizado. Recibe la lista de pestañas y la pestaña
 * activa por `@Input()`, y emite el id de la pestaña seleccionada por
 * `@Output()`.
 *
 * Accesibilidad: implementa el patrón WAI-ARIA de pestañas (`role="tablist"`,
 * `role="tab"`, `aria-selected`) con navegación por flechas y foco visible
 * (Req 27.1, 27.5).
 */
@Component({
  selector: 'app-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tabs.component.html',
  styleUrl: './tabs.component.scss',
})
export class TabsComponent {
  /** Pestañas a mostrar en orden. */
  @Input({ required: true }) tabs: readonly Tab[] = [];

  /** Id de la pestaña activa. */
  @Input() activa = '';

  /** Emite el id de la pestaña seleccionada (habilita `[(activa)]`). */
  @Output() activaChange = new EventEmitter<string>();

  /** Selecciona una pestaña por id y notifica el cambio. */
  protected seleccionar(id: string): void {
    if (id === this.activa) {
      return;
    }
    this.activa = id;
    this.activaChange.emit(id);
  }

  /** Navegación por teclado entre pestañas (flechas izquierda/derecha). */
  protected onKeydown(evento: KeyboardEvent, indice: number): void {
    if (this.tabs.length === 0) {
      return;
    }
    let destino = -1;
    if (evento.key === 'ArrowRight') {
      destino = (indice + 1) % this.tabs.length;
    } else if (evento.key === 'ArrowLeft') {
      destino = (indice - 1 + this.tabs.length) % this.tabs.length;
    }
    if (destino >= 0) {
      evento.preventDefault();
      this.seleccionar(this.tabs[destino].id);
    }
  }

  /** trackBy de pestañas para render eficiente. */
  protected trackTab(_indice: number, tab: Tab): string {
    return tab.id;
  }
}
