import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { IconComponent } from '../icon/icon.component';

export interface OpcionSegmentada {
  readonly valor: string;
  readonly etiqueta: string;
  readonly icono?: string;
}

/**
 * Selector segmentado de una sola opción (radiogroup accesible) del sistema
 * "Proyectiva Broker Nexus": tipo de inmueble, vigencia, tipo de persona, etc.
 * Navegación con flechas/Home/End; el ítem activo usa el slate del shell.
 */
@Component({
  selector: 'app-segmented-control',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="seg" role="radiogroup" [attr.aria-label]="ariaLabel">
      @for (opcion of opciones; track opcion.valor; let i = $index) {
        <button
          type="button"
          class="seg__opcion"
          role="radio"
          [class.seg__opcion--activa]="opcion.valor === valor"
          [attr.aria-checked]="opcion.valor === valor"
          [attr.tabindex]="esTabStop(opcion.valor) ? 0 : -1"
          (click)="seleccionar(opcion.valor)"
          (keydown)="onKeydown($event, i)"
        >
          @if (opcion.icono) {
            <app-icon [nombre]="opcion.icono" [tamano]="18" />
          }
          {{ opcion.etiqueta }}
        </button>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .seg {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-1);
        padding: var(--space-1);
        background: var(--sb-surface-low);
        border-radius: var(--radius-lg);
      }
      .seg__opcion {
        flex: 1 1 auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-2);
        min-height: var(--control-height-sm);
        padding: var(--space-1) var(--space-3);
        border: none;
        border-radius: var(--radius-md);
        background: transparent;
        color: var(--sb-secondary);
        font-family: var(--font-family-body);
        font-size: var(--text-body-sm);
        font-weight: var(--font-weight-semibold);
        cursor: pointer;
        transition:
          background 0.15s ease,
          color 0.15s ease;
      }
      .seg__opcion:hover {
        color: var(--sb-on-surface);
      }
      .seg__opcion--activa,
      .seg__opcion--activa:hover {
        background: var(--sb-slate);
        color: var(--sb-on-slate);
        box-shadow: var(--sb-shadow-1);
      }
      .seg__opcion:focus-visible {
        outline: var(--focus-ring-width) solid var(--color-focus-ring);
        outline-offset: var(--focus-ring-offset);
      }
      @media (prefers-reduced-motion: reduce) {
        .seg__opcion {
          transition: none;
        }
      }
    `,
  ],
})
export class SegmentedControlComponent {
  @Input({ required: true }) opciones: readonly OpcionSegmentada[] = [];
  @Input() valor = '';
  @Input() ariaLabel: string | null = null;
  @Output() valorChange = new EventEmitter<string>();

  protected esTabStop(valor: string): boolean {
    const hayActivo = this.opciones.some((o) => o.valor === this.valor);
    return hayActivo ? valor === this.valor : valor === this.opciones[0]?.valor;
  }

  protected seleccionar(valor: string): void {
    if (valor !== this.valor) {
      this.valorChange.emit(valor);
    }
  }

  protected onKeydown(evento: KeyboardEvent, indice: number): void {
    const total = this.opciones.length;
    let destino: number;
    switch (evento.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        destino = (indice + 1) % total;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        destino = (indice - 1 + total) % total;
        break;
      case 'Home':
        destino = 0;
        break;
      case 'End':
        destino = total - 1;
        break;
      default:
        return;
    }
    evento.preventDefault();
    this.seleccionar(this.opciones[destino].valor);
    const botones = (evento.currentTarget as HTMLElement).parentElement?.querySelectorAll('button');
    (botones?.[destino] as HTMLElement | undefined)?.focus();
  }
}
