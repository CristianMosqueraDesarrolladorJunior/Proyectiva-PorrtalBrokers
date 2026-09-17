import { Component, Input } from '@angular/core';

let contadorFormField = 0;

/**
 * Campo de formulario compartido tokenizado (Req 24.1, 35.14).
 *
 * Encapsula la estructura del prototipo (field/label/help/error): etiqueta,
 * texto de ayuda y mensaje de error, con proyección de contenido para el
 * control (input/select/textarea). Todos los estilos vía Design_Token (Req 25).
 * Aporta relaciones ARIA (`aria-describedby`/`aria-invalid`) para accesibilidad
 * (Req 27.2, 27.5).
 *
 * Uso:
 * ```html
 * <app-form-field label="Correo" ayuda="correo@ejemplo.com" [error]="errorCorreo">
 *   <input type="email" formControlName="correo" />
 * </app-form-field>
 * ```
 */
@Component({
  selector: 'app-form-field',
  standalone: true,
  templateUrl: './form-field.component.html',
  styleUrl: './form-field.component.scss',
})
export class FormFieldComponent {
  /** Texto de la etiqueta mostrada sobre el control (Req 35.14). */
  @Input() label = '';

  /** Texto de ayuda mostrado bajo el control cuando no hay error (Req 35.14). */
  @Input() ayuda = '';

  /** Mensaje de error a mostrar; cuando existe, marca el campo como inválido. */
  @Input() error = '';

  /** Indica que el campo es obligatorio (agrega marca visual y `aria-required`). */
  @Input() requerido = false;

  /** Identificador único del control para enlazar etiqueta y descripciones (ARIA). */
  @Input() controlId = `app-form-field-${++contadorFormField}`;

  /** Identificador del texto de ayuda para `aria-describedby`. */
  get ayudaId(): string {
    return `${this.controlId}-ayuda`;
  }

  /** Identificador del mensaje de error para `aria-describedby`. */
  get errorId(): string {
    return `${this.controlId}-error`;
  }

  /** Descripción ARIA activa: error si existe, de lo contrario la ayuda. */
  get descritoPor(): string | null {
    if (this.error) {
      return this.errorId;
    }
    if (this.ayuda) {
      return this.ayudaId;
    }
    return null;
  }
}
