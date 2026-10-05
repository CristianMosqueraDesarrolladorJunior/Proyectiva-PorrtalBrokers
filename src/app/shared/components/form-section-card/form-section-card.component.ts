import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/**
 * FormSectionCardComponent — Tarjeta de sección numerada del sistema
 * "Proyectiva Broker Nexus" (stitch).
 *
 * Encabeza una sección de formulario con un número en chip, un ícono opcional,
 * un título y un subtítulo opcional. El contenido de la sección se proyecta.
 * 100% tokenizado; superficie clara con borde y sombra sutil.
 *
 * Uso:
 * ```html
 * <app-form-section-card [numero]="1" icono="person" titulo="Datos del cliente">
 *   <!-- campos del formulario -->
 * </app-form-section-card>
 * ```
 */
@Component({
  selector: 'app-form-section-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <section class="fsc">
      <header class="fsc__cab">
        <span class="fsc__numero" aria-hidden="true">{{ numero }}</span>
        <div class="fsc__titulos">
          <h3 class="fsc__titulo">
            @if (icono) {
              <app-icon [nombre]="icono" [tamano]="20" />
            }
            {{ titulo }}
          </h3>
          @if (subtitulo) {
            <p class="fsc__subtitulo">{{ subtitulo }}</p>
          }
        </div>
      </header>
      <div class="fsc__cuerpo">
        <ng-content></ng-content>
      </div>
    </section>
  `,
  styles: [
    `
      .fsc {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
        padding: var(--card-padding);
        background: var(--sb-surface);
        border: 1px solid var(--sb-border);
        border-radius: var(--radius-xl);
        box-shadow: var(--sb-shadow-1);
      }
      .fsc__cab {
        display: flex;
        align-items: center;
        gap: var(--space-3);
      }
      .fsc__numero {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: var(--section-number-size);
        height: var(--section-number-size);
        border-radius: var(--radius-full);
        background: var(--sb-primary);
        color: var(--sb-on-primary);
        font-family: var(--font-family-heading);
        font-size: var(--text-body);
        font-weight: var(--font-weight-bold);
      }
      .fsc__titulos {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
      }
      .fsc__titulo {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        margin: 0;
        font-family: var(--font-family-heading);
        font-size: var(--text-subtitle);
        font-weight: var(--font-weight-semibold);
        color: var(--sb-on-surface);
      }
      .fsc__subtitulo {
        margin: 0;
        font-family: var(--font-family-body);
        font-size: var(--text-body-sm);
        color: var(--sb-secondary);
      }
      .fsc__cuerpo {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
      }
      .fsc__cuerpo ::ng-deep app-form-field {
        margin-bottom: 0;
      }
    `,
  ],
})
export class FormSectionCardComponent {
  /** Número de la sección mostrado en el chip. */
  @Input({ required: true }) numero = 1;

  /** Nombre del ícono Material Symbols opcional junto al título. */
  @Input() icono?: string;

  /** Título de la sección. */
  @Input({ required: true }) titulo = '';

  /** Subtítulo descriptivo opcional. */
  @Input() subtitulo?: string;
}
