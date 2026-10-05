import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Campo monetario del sistema de diseño: prefijo `$`, sufijo `COP`, foco naranja
 * y atajos "+$100k" opcionales. Emite el valor como texto numérico (el mismo
 * contrato que un `<input type="number">`), por lo que se integra con las
 * validaciones existentes (`validarCanon`, etc.). Debe ir dentro de
 * `<app-form-field>` (la etiqueta apunta a `inputId`).
 */
@Component({
  selector: 'app-money-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mi" [class.mi--error]="invalido">
      <span class="mi__prefijo" aria-hidden="true">$</span>
      <input
        class="mi__input"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        [id]="inputId"
        [name]="nombre || inputId"
        [value]="formateado"
        [attr.aria-invalid]="invalido ? 'true' : null"
        (input)="onInput($event)"
      />
      <span class="mi__sufijo" aria-hidden="true">COP</span>
    </div>
    @if (atajos.length > 0) {
      <div class="mi__atajos" role="group" aria-label="Montos rápidos">
        <span class="mi__atajos-label">Rápido:</span>
        @for (atajo of atajos; track atajo) {
          <button type="button" class="mi__atajo" (click)="sumar(atajo)">
            +{{ etiquetaAtajo(atajo) }}
          </button>
        }
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .mi {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        min-height: var(--control-height);
        padding: 0 var(--space-3);
        background: var(--sb-surface-low);
        border: 1px solid var(--sb-border);
        border-radius: var(--radius-md);
      }
      .mi:focus-within {
        border-color: var(--sb-primary);
        box-shadow: 0 0 0 3px var(--sb-primary-fixed);
      }
      .mi--error {
        border-color: var(--sb-error);
      }
      .mi__prefijo,
      .mi__sufijo {
        color: var(--sb-secondary);
        font-weight: var(--font-weight-semibold);
      }
      .mi__sufijo {
        font-size: var(--text-caption);
        letter-spacing: 0.06em;
      }
      /* Selector duplicado: gana al estilo genérico de inputs de form-field (::ng-deep). */
      .mi input.mi__input.mi__input {
        flex: 1;
        width: auto;
        min-width: 0;
        min-height: 0;
        padding: 0;
        border: none;
        border-radius: 0;
        box-shadow: none;
        outline: none;
        background: transparent;
        color: var(--sb-on-surface);
        font-family: var(--font-family-body);
        font-size: var(--text-body);
        font-weight: var(--font-weight-semibold);
        appearance: textfield;
        -moz-appearance: textfield;
      }
      .mi__input::-webkit-outer-spin-button,
      .mi__input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      .mi__atajos {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--space-2);
        margin-top: var(--space-2);
      }
      .mi__atajos-label {
        font-size: var(--text-caption);
        font-weight: var(--font-weight-semibold);
        color: var(--sb-secondary);
      }
      .mi__atajo {
        padding: var(--space-1) var(--space-3);
        border: none;
        border-radius: var(--radius-pill);
        background: var(--sb-surface-container);
        color: var(--sb-on-surface);
        font-size: var(--text-caption);
        font-weight: var(--font-weight-semibold);
        cursor: pointer;
      }
      .mi__atajo:hover {
        background: var(--sb-surface-high);
      }
      .mi__atajo:focus-visible {
        outline: var(--focus-ring-width) solid var(--color-focus-ring);
        outline-offset: var(--focus-ring-offset);
      }
    `,
  ],
})
export class MoneyInputComponent {
  @Input({ required: true }) inputId = '';
  @Input() nombre: string | null = null;
  @Input() valor: string | number = '';
  @Input() invalido = false;
  /** Incrementos rápidos en COP (p. ej. 100000 → "+$100k"). */
  @Input() atajos: readonly number[] = [];
  @Output() valorChange = new EventEmitter<string>();

  /** Valor con separador de miles (es-CO); el modelo conserva solo los dígitos. */
  protected get formateado(): string {
    const digitos = String(this.valor ?? '').replace(/\D/g, '');
    return digitos.length > 0 ? new Intl.NumberFormat('es-CO').format(Number(digitos)) : '';
  }

  protected onInput(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    const digitos = campo.value.replace(/\D/g, '');
    campo.value = digitos.length > 0 ? new Intl.NumberFormat('es-CO').format(Number(digitos)) : '';
    this.valorChange.emit(digitos);
  }

  protected sumar(incremento: number): void {
    const actual = Number(this.valor);
    const base = Number.isFinite(actual) ? actual : 0;
    this.valorChange.emit(String(base + incremento));
  }

  protected etiquetaAtajo(valor: number): string {
    if (valor >= 1_000_000) {
      return `$${valor / 1_000_000}M`;
    }
    return `$${valor / 1000}k`;
  }
}
