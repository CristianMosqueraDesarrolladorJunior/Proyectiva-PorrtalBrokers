import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/** Variante de color del GuaranteeBadge (stitch). */
export type VarianteGarantia = 'tertiary' | 'secondary' | 'primary';

/**
 * GuaranteeBadge — pill informativo con ícono del sistema stitch.
 *
 * Comunica garantías/estados destacados (ej. "Tarifas 2026 Vigentes",
 * "Aprobación en 4 horas"). Ícono Material Symbols + texto, en forma de pastilla.
 * Totalmente tokenizado y decorativo (el texto ya comunica el significado).
 */
@Component({
  selector: 'app-guarantee-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `<span class="guarantee-badge" [class]="'guarantee-badge--' + variante">
    <app-icon [nombre]="icono" [tamano]="16" />
    <span class="guarantee-badge__texto"><ng-content /></span>
  </span>`,
  styleUrl: './guarantee-badge.component.scss',
})
export class GuaranteeBadgeComponent {
  /** Glifo Material Symbols del badge. */
  @Input() icono = 'bolt';

  /** Variante de color. */
  @Input() variante: VarianteGarantia = 'tertiary';
}
