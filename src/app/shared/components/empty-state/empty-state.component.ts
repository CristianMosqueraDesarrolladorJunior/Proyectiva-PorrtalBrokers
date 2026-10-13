import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { IconComponent } from '../icon/icon.component';

/**
 * Estado vacío premium y uniforme para listados y vistas sin datos.
 * Reemplaza los "No hay información disponible." sueltos.
 * Acciones opcionales: `<div acciones>…</div>`.
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <section class="es" role="status">
      <span class="es__icono" aria-hidden="true">
        <app-icon [nombre]="icono" [tamano]="28" />
      </span>
      <h3 class="es__titulo">{{ titulo }}</h3>
      @if (descripcion) {
        <p class="es__descripcion">{{ descripcion }}</p>
      }
      <div class="es__acciones"><ng-content select="[acciones]"></ng-content></div>
    </section>
  `,
  styles: [
    `
      .es {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-9) var(--space-6);
        border: 1px dashed var(--sb-border);
        border-radius: var(--radius-panel);
        background: var(--sb-surface);
        text-align: center;
      }
      .es__icono {
        display: grid;
        place-items: center;
        width: var(--orbe-size-md);
        height: var(--orbe-size-md);
        margin-bottom: var(--space-2);
        border-radius: var(--radius-full);
        background: var(--sb-tint-accent-bg);
        color: var(--sb-primary);
      }
      .es__titulo {
        margin: 0;
        font-size: var(--text-subtitle);
        font-weight: var(--font-weight-bold);
        color: var(--sb-on-surface);
      }
      .es__descripcion {
        max-width: 46ch;
        margin: 0;
        color: var(--sb-secondary);
        line-height: var(--line-height-normal);
      }
      .es__acciones:not(:empty) {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: var(--space-3);
        margin-top: var(--space-3);
      }
    `,
  ],
})
export class EmptyStateComponent {
  @Input() icono = 'inbox';
  @Input() titulo = 'Aún no hay información';
  @Input() descripcion: string | null = null;
}
