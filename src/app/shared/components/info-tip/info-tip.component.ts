import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Ayuda contextual junto a un término técnico (glosario en línea). Se muestra al
 * pasar el cursor o al enfocar con teclado; el texto se expone a lectores de
 * pantalla mediante `aria-describedby`. Sin dependencias de JS para el popover.
 */
@Component({
  selector: 'app-info-tip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="tip">
      <button type="button" class="tip__btn" [attr.aria-label]="etiqueta" [attr.aria-describedby]="idTip">
        <span class="material-symbols-outlined" aria-hidden="true">help</span>
      </button>
      <span class="tip__texto" role="tooltip" [id]="idTip">{{ texto }}</span>
    </span>
  `,
  styles: [
    `
      .tip {
        position: relative;
        display: inline-flex;
        vertical-align: middle;
      }
      .tip__btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border: none;
        border-radius: var(--radius-full);
        background: transparent;
        color: var(--sb-secondary);
        cursor: help;
      }
      .tip__btn .material-symbols-outlined {
        font-size: var(--text-subtitle);
      }
      .tip__btn:hover,
      .tip__btn:focus-visible {
        color: var(--sb-primary-hover);
      }
      .tip__btn:focus-visible {
        outline: var(--focus-ring-width) solid var(--color-focus-ring);
        outline-offset: var(--focus-ring-offset);
      }
      .tip__texto {
        position: absolute;
        bottom: calc(100% + var(--space-2));
        left: 50%;
        z-index: var(--z-topbar);
        width: max-content;
        max-width: 280px;
        padding: var(--space-2) var(--space-3);
        border-radius: var(--radius-md);
        background: var(--sb-slate);
        color: var(--sb-on-slate);
        font-size: var(--text-caption);
        font-weight: var(--font-weight-regular);
        line-height: var(--line-height-normal);
        text-align: left;
        text-transform: none;
        letter-spacing: normal;
        box-shadow: var(--sb-shadow-3);
        transform: translateX(-50%);
        visibility: hidden;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.12s ease;
      }
      .tip:hover .tip__texto,
      .tip:focus-within .tip__texto {
        visibility: visible;
        opacity: 1;
      }
      @media (prefers-reduced-motion: reduce) {
        .tip__texto {
          transition: none;
        }
      }
    `,
  ],
})
export class InfoTipComponent {
  private static siguiente = 0;

  @Input({ required: true }) texto = '';
  @Input() etiqueta = 'Más información';

  protected readonly idTip = `info-tip-${InfoTipComponent.siguiente++}`;
}
