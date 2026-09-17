import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  forwardRef,
  Input,
  Output,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * ToggleSwitchComponent — Componente_Compartido de interruptor (Req 35.6, 24.3).
 *
 * Encapsula `toggle-switch` y `toggle-slider` del prototipo, totalmente
 * tokenizado. Expone el estado mediante `@Input() checked` / `@Output()
 * checkedChange` (two-way binding `[(checked)]`) e implementa
 * `ControlValueAccessor` para integrarse con formularios reactivos.
 *
 * Accesibilidad: usa `role="switch"` con `aria-checked` para exponer el estado
 * al lector de pantalla, es operable por teclado (Enter/Espacio) y muestra foco
 * visible (Req 27.1, 27.5).
 */
@Component({
  selector: 'app-toggle-switch',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './toggle-switch.component.html',
  styleUrl: './toggle-switch.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ToggleSwitchComponent),
      multi: true,
    },
  ],
})
export class ToggleSwitchComponent implements ControlValueAccessor {
  /** Estado del interruptor (activo/inactivo). */
  @Input() checked = false;

  /** Estado deshabilitado del interruptor. */
  @Input() disabled = false;

  /** Etiqueta accesible del interruptor para lectores de pantalla. */
  @Input() ariaLabel = 'Interruptor';

  /** Emite el nuevo estado al conmutar (habilita `[(checked)]`). */
  @Output() checkedChange = new EventEmitter<boolean>();

  private onChange: (valor: boolean) => void = () => {};
  private onTouched: () => void = () => {};

  /** Conmuta el estado si no está deshabilitado y notifica a los consumidores. */
  protected alternar(): void {
    if (this.disabled) {
      return;
    }
    this.checked = !this.checked;
    this.checkedChange.emit(this.checked);
    this.onChange(this.checked);
    this.onTouched();
  }

  /** Maneja la activación por teclado (Enter/Espacio). */
  protected onKeydown(evento: KeyboardEvent): void {
    if (evento.key === 'Enter' || evento.key === ' ' || evento.key === 'Spacebar') {
      evento.preventDefault();
      this.alternar();
    }
  }

  /** ControlValueAccessor: escribe el valor desde el formulario. */
  writeValue(valor: boolean): void {
    this.checked = !!valor;
  }

  /** ControlValueAccessor: registra el callback de cambio. */
  registerOnChange(fn: (valor: boolean) => void): void {
    this.onChange = fn;
  }

  /** ControlValueAccessor: registra el callback de "touched". */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /** ControlValueAccessor: establece el estado deshabilitado. */
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
