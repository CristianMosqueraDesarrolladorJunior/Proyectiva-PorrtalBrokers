import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  forwardRef,
  Input,
  Output,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/** Opción seleccionable del grupo de tarjetas de radio (Req 35.10). */
export interface OpcionRadio {
  readonly valor: string;
  readonly etiqueta: string;
  readonly descripcion?: string;
}

/**
 * RadioGroupComponent — Componente_Compartido de tarjetas de selección
 * (Req 35.10, 24.3).
 *
 * Encapsula `radio-group` y `radio-card` del prototipo, totalmente tokenizado.
 * Recibe las opciones por `@Input()` y expone la selección mediante
 * `@Input() valor` / `@Output() valorChange` (two-way `[(valor)]`), además de
 * implementar `ControlValueAccessor` para formularios reactivos.
 *
 * Accesibilidad: implementa el patrón WAI-ARIA de radiogroup (`role="radiogroup"`
 * y `role="radio"` con `aria-checked`), navegable por teclado (flechas y
 * Espacio/Enter) con foco visible (Req 27.1, 27.5).
 */
@Component({
  selector: 'app-radio-group',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './radio-group.component.html',
  styleUrl: './radio-group.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RadioGroupComponent),
      multi: true,
    },
  ],
})
export class RadioGroupComponent implements ControlValueAccessor {
  /** Opciones a presentar como tarjetas de selección. */
  @Input({ required: true }) opciones: readonly OpcionRadio[] = [];

  /** Valor actualmente seleccionado. */
  @Input() valor = '';

  /** Estado deshabilitado del grupo. */
  @Input() disabled = false;

  /** Etiqueta accesible del grupo para lectores de pantalla. */
  @Input() ariaLabel = 'Grupo de opciones';

  /** Emite el nuevo valor seleccionado (habilita `[(valor)]`). */
  @Output() valorChange = new EventEmitter<string>();

  private onChange: (valor: string) => void = () => {};
  private onTouched: () => void = () => {};

  /** Selecciona una opción por valor y notifica a los consumidores. */
  protected seleccionar(valor: string): void {
    if (this.disabled || valor === this.valor) {
      return;
    }
    this.valor = valor;
    this.valorChange.emit(valor);
    this.onChange(valor);
    this.onTouched();
  }

  /** Navegación por teclado entre opciones (flechas y Espacio/Enter). */
  protected onKeydown(evento: KeyboardEvent, indice: number): void {
    if (this.disabled || this.opciones.length === 0) {
      return;
    }
    if (evento.key === 'Enter' || evento.key === ' ' || evento.key === 'Spacebar') {
      evento.preventDefault();
      this.seleccionar(this.opciones[indice].valor);
      return;
    }
    let destino = -1;
    if (evento.key === 'ArrowRight' || evento.key === 'ArrowDown') {
      destino = (indice + 1) % this.opciones.length;
    } else if (evento.key === 'ArrowLeft' || evento.key === 'ArrowUp') {
      destino = (indice - 1 + this.opciones.length) % this.opciones.length;
    }
    if (destino >= 0) {
      evento.preventDefault();
      this.seleccionar(this.opciones[destino].valor);
    }
  }

  /** Índice de foco tabulable: la opción seleccionada o la primera. */
  protected esTabulable(indice: number): boolean {
    const seleccionado = this.opciones.findIndex((opcion) => opcion.valor === this.valor);
    return seleccionado >= 0 ? indice === seleccionado : indice === 0;
  }

  /** ControlValueAccessor: escribe el valor desde el formulario. */
  writeValue(valor: string): void {
    this.valor = valor ?? '';
  }

  /** ControlValueAccessor: registra el callback de cambio. */
  registerOnChange(fn: (valor: string) => void): void {
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

  /** trackBy de opciones para render eficiente. */
  protected trackOpcion(_indice: number, opcion: OpcionRadio): string {
    return opcion.valor;
  }
}
