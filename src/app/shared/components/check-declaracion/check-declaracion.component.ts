import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { IconComponent } from '../icon/icon.component';

/**
 * Casilla de declaración o aceptación (p. ej. «Declaro que…», «Acepto el tratamiento de mis datos»): una tarjeta con la
 * casilla, el texto proyectado y su mensaje de error. Funciona con `formControlName` / `[formControl]` y siempre inicia
 * sin marcar si el control así lo define.
 */
@Component({
  selector: 'app-check-declaracion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CheckDeclaracionComponent), multi: true }],
  template: `
    <label class="cd" [class.cd--compacta]="compacta()" [class.cd--marcada]="valor()" [class.cd--error]="!!error()" [attr.for]="controlId()">
      <input
        type="checkbox"
        class="cd__casilla"
        [id]="controlId()"
        [checked]="valor()"
        [disabled]="deshabilitado()"
        [attr.aria-invalid]="!!error()"
        [attr.aria-describedby]="error() ? controlId() + '-error' : null"
        (change)="cambiar($event)"
        (blur)="alTocar()"
      />
      <span class="cd__texto"><ng-content /></span>
    </label>
    @if (error(); as e) {
      <p class="cd__error" [id]="controlId() + '-error'" role="alert"><app-icon nombre="error" [tamano]="16" /> {{ e }}</p>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .cd {
        display: flex;
        align-items: flex-start;
        gap: var(--space-3);
        padding: var(--space-3);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        background: var(--color-card);
        font-size: var(--text-body-sm);
        color: var(--color-text);
        cursor: pointer;
      }
      .cd--compacta {
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-2) var(--space-3);
        font-size: var(--text-caption);
      }
      .cd--marcada {
        border-color: var(--color-accent);
        background: var(--color-accent-light);
      }
      .cd--error {
        border-color: var(--color-danger);
      }
      .cd__casilla {
        flex: none;
        width: 18px;
        height: 18px;
        margin-top: var(--space-0);
        accent-color: var(--color-accent);
        cursor: pointer;
      }
      .cd__casilla:focus-visible {
        outline: var(--focus-ring-width) solid var(--color-focus-ring);
        outline-offset: var(--focus-ring-offset);
      }
      .cd__texto {
        line-height: var(--line-height-normal);
      }
      .cd__error {
        display: flex;
        align-items: center;
        gap: var(--space-1);
        margin: var(--space-1) var(--space-0) var(--space-0);
        font-size: var(--text-caption);
        color: var(--color-danger);
      }
    `,
  ],
})
export class CheckDeclaracionComponent implements ControlValueAccessor {
  readonly controlId = input.required<string>();
  /** Mensaje de error ya resuelto por el contenedor; vacío = sin error. */
  readonly error = input<string>('');
  /** Versión de poco alto para formularios que no deben desplazarse. */
  readonly compacta = input<boolean>(false);

  protected readonly valor = signal(false);
  protected readonly deshabilitado = signal(false);
  private alCambiar: (v: boolean) => void = () => undefined;
  protected alTocar: () => void = () => undefined;

  writeValue(v: boolean | null): void {
    this.valor.set(!!v);
  }

  registerOnChange(fn: (v: boolean) => void): void {
    this.alCambiar = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.alTocar = fn;
  }

  setDisabledState(deshabilitado: boolean): void {
    this.deshabilitado.set(deshabilitado);
  }

  protected cambiar(evento: Event): void {
    const marcado = (evento.target as HTMLInputElement).checked;
    this.valor.set(marcado);
    this.alCambiar(marcado);
    this.alTocar();
  }
}
