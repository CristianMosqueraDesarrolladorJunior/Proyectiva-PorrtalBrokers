import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

import { IconComponent } from '../icon/icon.component';

/**
 * Diálogo modal reutilizable (reemplaza los `modal-overlay` del prototipo):
 * `role="dialog"` + `aria-modal`, cierre con Esc, clic en el fondo o botón ✕,
 * y foco inicial en el botón de cierre. Contenido por defecto proyectado;
 * acciones en `<div acciones>`.
 */
@Component({
  selector: 'app-modal-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    @if (abierto) {
      <div class="md__fondo" (click)="cerrar.emit()">
        <section
          class="md"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="titulo"
          (click)="$event.stopPropagation()"
        >
          <header class="md__cab">
            <h2 class="md__titulo">{{ titulo }}</h2>
            <button
              #cierre
              type="button"
              class="md__cerrar"
              aria-label="Cerrar"
              (click)="cerrar.emit()"
            >
              <app-icon nombre="close" [tamano]="20" />
            </button>
          </header>
          <div class="md__cuerpo"><ng-content></ng-content></div>
          <div class="md__acciones"><ng-content select="[acciones]"></ng-content></div>
        </section>
      </div>
    }
  `,
  styles: [
    `
      .md__fondo {
        position: fixed;
        inset: 0;
        z-index: 1100;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--space-4);
        background: var(--color-overlay);
      }
      .md {
        width: 100%;
        max-width: 480px;
        max-height: 90vh;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
        padding: var(--space-6);
        background: var(--sb-surface);
        border-radius: var(--radius-2xl);
        box-shadow: var(--shadow-modal);
      }
      .md__cab {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-3);
      }
      .md__titulo {
        margin: 0;
        font-size: var(--text-title);
        font-weight: var(--font-weight-semibold);
        color: var(--sb-on-surface);
      }
      .md__cerrar {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--menu-button-size);
        height: var(--menu-button-size);
        flex-shrink: 0;
        border: none;
        border-radius: var(--radius-full);
        background: transparent;
        color: var(--sb-secondary);
        cursor: pointer;
      }
      .md__cerrar:hover {
        background: var(--sb-surface-low);
      }
      .md__cerrar:focus-visible {
        outline: var(--focus-ring-width) solid var(--color-focus-ring);
        outline-offset: var(--focus-ring-offset);
      }
      .md__cuerpo {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        font-size: var(--text-body);
        line-height: var(--line-height-normal);
        color: var(--sb-on-surface);
      }
      .md__acciones:empty {
        display: none;
      }
      .md__acciones {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }
    `,
  ],
})
export class ModalDialogComponent implements OnChanges {
  @Input() abierto = false;
  @Input({ required: true }) titulo = '';
  @Output() cerrar = new EventEmitter<void>();

  @ViewChild('cierre') private botonCierre?: ElementRef<HTMLButtonElement>;

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['abierto']?.currentValue === true) {
      // Espera al render del @if para enfocar el botón de cierre.
      setTimeout(() => this.botonCierre?.nativeElement.focus());
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.abierto) {
      this.cerrar.emit();
    }
  }
}
