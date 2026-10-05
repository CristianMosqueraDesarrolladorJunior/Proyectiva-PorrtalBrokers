import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * IconComponent — Ícono del sistema de diseño "Proyectiva Broker Nexus" (stitch).
 *
 * Envuelve un glifo de **Material Symbols Outlined** con tamaño y relleno (fill)
 * configurables por `@Input()`, totalmente tokenizado. Es decorativo por defecto
 * (`aria-hidden="true"`); para íconos con significado se puede pasar `ariaLabel`.
 *
 * Uso:
 * ```html
 * <app-icon nombre="home" [tamano]="20" />
 * <app-icon nombre="check_circle" [relleno]="true" ariaLabel="Completado" />
 * ```
 */
@Component({
  selector: 'app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span
    class="material-symbols-outlined app-icon"
    [style.font-size.px]="tamano"
    [style.font-variation-settings]="variationSettings"
    [attr.aria-hidden]="ariaLabel ? null : 'true'"
    [attr.role]="ariaLabel ? 'img' : null"
    [attr.aria-label]="ariaLabel"
    >{{ nombre }}</span>`,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
      }
      .app-icon {
        color: inherit;
      }
    `,
  ],
})
export class IconComponent {
  /** Nombre del glifo Material Symbols (p. ej. "home", "check_circle"). */
  @Input({ required: true }) nombre = '';

  /** Tamaño del ícono en píxeles (coincide con la escala de stitch 14–28). */
  @Input() tamano = 20;

  /** Si el ícono debe mostrarse relleno (FILL 1) en vez de contorno (FILL 0). */
  @Input() relleno = false;

  /** Peso del trazo (Material Symbols `wght`, 100–700). */
  @Input() peso = 400;

  /** Etiqueta accesible; si se define, el ícono deja de ser decorativo. */
  @Input() ariaLabel: string | null = null;

  /** Ajustes de variación de la fuente Material Symbols según inputs. */
  protected get variationSettings(): string {
    return `'FILL' ${this.relleno ? 1 : 0}, 'wght' ${this.peso}, 'GRAD' 0, 'opsz' 24`;
  }
}
