import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * AvatarInitialsComponent — Avatar de iniciales del sistema "Proyectiva Broker Nexus" (stitch).
 *
 * Deriva hasta dos iniciales a partir del nombre completo y las muestra en un
 * círculo con color de fondo tokenizado. El tamaño (px) es configurable. El
 * avatar expone `role="img"` con `aria-label` para lectores de pantalla.
 *
 * Uso:
 * ```html
 * <app-avatar-initials nombre="Cristian Mosquera" [tamano]="40" />
 * ```
 */
@Component({
  selector: 'app-avatar-initials',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="ai"
      role="img"
      [attr.aria-label]="nombre"
      [style.width.px]="tamano"
      [style.height.px]="tamano"
      [style.font-size.px]="tamanoFuente"
      >{{ iniciales }}</span
    >
  `,
  styles: [
    `
      .ai {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-full);
        background: var(--sb-primary-fixed);
        color: var(--sb-on-primary-fixed);
        font-family: var(--font-family-heading);
        font-weight: var(--font-weight-bold);
        line-height: 1;
        user-select: none;
      }
    `,
  ],
})
export class AvatarInitialsComponent {
  /** Nombre completo del cual se derivan las iniciales. */
  @Input({ required: true }) nombre = '';

  /** Diámetro del avatar en píxeles. */
  @Input() tamano = 36;

  /** Iniciales derivadas del nombre (máximo 2 letras, en mayúsculas). */
  protected get iniciales(): string {
    const partes = this.nombre
      .trim()
      .split(/\s+/)
      .filter((parte) => parte.length > 0);
    if (partes.length === 0) {
      return '';
    }
    const primera = partes[0].charAt(0);
    const segunda = partes.length > 1 ? partes[partes.length - 1].charAt(0) : '';
    return (primera + segunda).toUpperCase();
  }

  /** Tamaño de fuente proporcional al diámetro del avatar. */
  protected get tamanoFuente(): number {
    return Math.round(this.tamano * 0.4);
  }
}
