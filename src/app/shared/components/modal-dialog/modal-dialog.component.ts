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
import { TabsComponent, type Tab } from '../tabs/tabs.component';

/** Ancho del diálogo: sm (confirmaciones), md (formularios), lg y xl (operación de un registro). */
export type TamanoModal = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Diálogo modal reutilizable de toda la plataforma: `role="dialog"` + `aria-modal`, cierre con Esc,
 * clic en el fondo o ✕ y foco inicial en el cierre. Cabecera y pie fijos con el cuerpo desplazable;
 * subtítulo, insignias (`<div cabecera>`) y pestañas opcionales para operar un registro completo
 * (Detalle · Acciones · Historial). Contenido por defecto proyectado; acciones en `<div acciones>`.
 */
@Component({
  selector: 'app-modal-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, TabsComponent],
  template: `
    @if (abierto) {
      <div class="md__fondo" (click)="cerrar.emit()">
        <section
          [class]="'md md--' + tamano"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="titulo"
          (click)="$event.stopPropagation()"
        >
          <header class="md__cab">
            <div class="md__titulos">
              @if (eyebrow) {
                <span class="md__eyebrow">{{ eyebrow }}</span>
              }
              <h2 class="md__titulo">{{ titulo }}</h2>
              @if (subtitulo) {
                <p class="md__subtitulo">{{ subtitulo }}</p>
              }
              <div class="md__insignias"><ng-content select="[cabecera]"></ng-content></div>
            </div>
            <button #cierre type="button" class="md__cerrar" aria-label="Cerrar" (click)="cerrar.emit()">
              <app-icon nombre="close" [tamano]="20" />
            </button>
          </header>
          @if (pestanas.length) {
            <div class="md__pestanas">
              <app-tabs [tabs]="pestanas" [activa]="pestana" (activaChange)="pestanaChange.emit($event)" />
            </div>
          }
          <div class="md__cuerpo"><ng-content></ng-content></div>
          <footer class="md__acciones"><ng-content select="[acciones]"></ng-content></footer>
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
        backdrop-filter: blur(2px);
      }
      .md {
        width: 100%;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background: var(--sb-surface);
        border: 1px solid var(--sb-border);
        border-radius: var(--radius-2xl);
        box-shadow: var(--shadow-modal);
        animation: md-entrada 160ms ease-out;
        position: relative;
      }
      .md--sm {
        max-width: 480px;
      }
      .md--md {
        max-width: 640px;
      }
      .md--lg {
        max-width: 880px;
      }
      .md--xl {
        max-width: 1120px;
      }
      @keyframes md-entrada {
        from {
          opacity: 0;
          transform: translateY(8px) scale(0.99);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .md {
          animation: none;
        }
      }
      .md__cab {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-3);
        padding: var(--space-6) var(--space-6) var(--space-4);
        background: var(--sb-surface);
      }
      .md__titulos {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        min-width: 0;
      }
      .md__eyebrow {
        font-size: var(--text-caption);
        font-weight: var(--font-weight-bold);
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--sb-tertiary);
      }
      .md__titulo {
        margin: 0;
        font-family: var(--font-family-heading);
        font-size: var(--text-title);
        font-weight: var(--font-weight-bold);
        letter-spacing: -0.01em;
        color: var(--sb-on-surface);
        overflow-wrap: anywhere;
      }
      .md__subtitulo {
        margin: 0;
        font-size: var(--text-body);
        color: var(--sb-secondary);
      }
      .md__insignias {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
      }
      .md__insignias:empty {
        display: none;
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
      .md__pestanas {
        padding: 0 var(--space-6);
        background: var(--sb-surface);
        border-bottom: 1px solid var(--sb-border);
      }
      .md__cab + .md__cuerpo {
        border-top: 1px solid var(--sb-border);
      }
      .md__cuerpo {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
        padding: var(--space-5) var(--space-6);
        background: var(--sb-surface-low);
        font-size: var(--text-body);
        line-height: var(--line-height-normal);
        color: var(--sb-on-surface);
      }
      .md__acciones {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: var(--space-2);
        padding: var(--space-4) var(--space-6);
        border-top: 1px solid var(--sb-border);
        background: var(--sb-surface);
      }
      .md__acciones:empty {
        display: none;
      }
    `,
  ],
})
export class ModalDialogComponent implements OnChanges {
  @Input() abierto = false;
  @Input({ required: true }) titulo = '';
  @Input() subtitulo = '';
  @Input() eyebrow = '';
  @Input() tamano: TamanoModal = 'sm';
  /** Pestañas opcionales (p. ej. Detalle · Acciones · Historial); el anfitrión cambia el contenido. */
  @Input() pestanas: readonly Tab[] = [];
  @Input() pestana = '';
  @Output() pestanaChange = new EventEmitter<string>();
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
