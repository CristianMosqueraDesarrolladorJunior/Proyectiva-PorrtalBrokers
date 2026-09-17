import { Component, Input } from '@angular/core';

/** Variantes de banner de alerta del prototipo (Req 35.14). */
export type VarianteAlerta = 'success' | 'warning' | 'error';

/**
 * Banner de alerta tokenizado (Req 24.1, 35.14).
 *
 * Encapsula las variantes success/warning/error del prototipo (.alert-card,
 * .alert-warning y equivalentes) para avisos y alertas SARLAFT. Todos los
 * colores/espaciados/radios se referencian vía Design_Token (Req 25).
 *
 * Expone `role="alert"` con `aria-live` para anunciar el aviso a las
 * tecnologías de asistencia (Req 27.2, 27.4). El título es opcional y el
 * cuerpo se proyecta como contenido; las acciones se proyectan en el slot
 * `[alertaAcciones]`.
 *
 * Uso:
 * ```html
 * <app-alert-banner variante="warning" titulo="Importante">
 *   Sin contrato firmado no hay seguro.
 * </app-alert-banner>
 * ```
 */
@Component({
  selector: 'app-alert-banner',
  standalone: true,
  templateUrl: './alert-banner.component.html',
  styleUrl: './alert-banner.component.scss',
})
export class AlertBannerComponent {
  /** Variante visual del banner (Req 35.14). */
  @Input() variante: VarianteAlerta = 'success';

  /** Título opcional en negrita del banner. */
  @Input() titulo: string | null = null;

  /** Ícono decorativo mostrado a la izquierda (emoji del prototipo). */
  @Input() icono: string | null = null;

  /** Ícono por defecto según la variante cuando no se especifica uno. */
  get iconoEfectivo(): string {
    if (this.icono !== null) {
      return this.icono;
    }
    if (this.variante === 'success') {
      return '✓';
    }
    if (this.variante === 'error') {
      return '⚠';
    }
    return 'ℹ️';
  }

  /**
   * `aria-live` según severidad: los errores se anuncian de forma asertiva,
   * el resto de forma cortés (Req 27.4).
   */
  get ariaLive(): 'assertive' | 'polite' {
    return this.variante === 'error' ? 'assertive' : 'polite';
  }
}
