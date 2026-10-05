import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Placeholder de carga (skeleton): alternativa no bloqueante al loader.
 * Filas de ancho decreciente; respeta prefers-reduced-motion.
 */
@Component({
  selector: 'app-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sk" role="status" aria-live="polite" [attr.aria-label]="ariaLabel">
      @for (n of filas; track n) {
        <span class="sk__linea" [style.height.px]="alto" [style.width.%]="100 - (n % 3) * 12"></span>
      }
    </div>
  `,
  styles: [
    `
      .sk {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
      }
      .sk__linea {
        display: block;
        border-radius: var(--radius-md);
        background: linear-gradient(
          90deg,
          var(--sb-surface-container) 25%,
          var(--sb-surface-low) 50%,
          var(--sb-surface-container) 75%
        );
        background-size: 200% 100%;
        animation: sk-brillo 1.4s ease-in-out infinite;
      }
      @keyframes sk-brillo {
        from {
          background-position: 200% 0;
        }
        to {
          background-position: -200% 0;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .sk__linea {
          animation: none;
        }
      }
    `,
  ],
})
export class SkeletonComponent {
  @Input() lineas = 4;
  @Input() alto = 20;
  @Input() ariaLabel = 'Cargando contenido';

  protected get filas(): number[] {
    return Array.from({ length: this.lineas }, (_, i) => i);
  }
}
