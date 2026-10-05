import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/** Variantes de botón del prototipo (Req 35.1). */
export type VarianteBoton =
  | 'primary'
  | 'accent'
  | 'ghost'
  | 'outline'
  | 'sm'
  | 'back';

/** Tipo HTML del botón. */
export type TipoBoton = 'button' | 'submit' | 'reset';

/**
 * Botón compartido tokenizado (Req 24.1, 35.1).
 *
 * Encapsula las variantes del prototipo (btn-primary, btn-accent, btn-ghost,
 * btn-outline, btn-sm, btn-back). Todos los estilos se referencian vía
 * Design_Token (Req 25); expone estado `disabled` accesible con foco visible
 * y atributos ARIA (Req 27.2, 27.3, 27.5).
 *
 * Uso:
 * ```html
 * <app-boton variante="accent" (clicked)="cotizar()">Ver cotización</app-boton>
 * <app-boton variante="primary" type="submit" [disabled]="!formularioValido">Enviar</app-boton>
 * ```
 */
@Component({
  selector: 'app-boton',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './boton.component.html',
  styleUrl: './boton.component.scss',
})
export class BotonComponent {
  /** Nombre del ícono Material Symbols opcional a mostrar al inicio del botón. */
  @Input() icono: string | null = null;

  /** Variante visual del botón (Req 35.1). */
  @Input() variante: VarianteBoton = 'primary';

  /** Tipo HTML del botón. */
  @Input() type: TipoBoton = 'button';

  /** Deshabilita la interacción y aplica el estilo deshabilitado. */
  @Input() disabled = false;

  /** Marca la variante `sm` como activa (estado seleccionado, p. ej. filtros). */
  @Input() activo = false;

  /**
   * Etiqueta accesible del botón cuando su contenido no es textual
   * (por ejemplo, la variante `back` con solo un ícono).
   */
  @Input() ariaLabel: string | null = null;

  /** Emite al hacer clic, solo si el botón no está deshabilitado. */
  @Output() clicked = new EventEmitter<void>();

  /** Maneja el clic; no emite cuando está deshabilitado. */
  onClick(): void {
    if (!this.disabled) {
      this.clicked.emit();
    }
  }
}
