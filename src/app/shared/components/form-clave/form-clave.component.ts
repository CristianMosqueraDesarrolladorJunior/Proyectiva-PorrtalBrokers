import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { AlertBannerComponent } from '../alert-banner/alert-banner.component';
import { BotonComponent } from '../boton/boton.component';
import { FormFieldComponent } from '../form-field/form-field.component';

/** Misma política que el backend: entre 8 y 128 caracteres. */
export const CLAVE_FUERTE = /^.{8,128}$/s;

export interface CambioClave {
  readonly actual: string;
  readonly nueva: string;
}

/**
 * Formulario de cambio de contraseña (actual, nueva y confirmación) con la política del backend.
 * Presentacional: emite `guardar` y la página llama al servicio. `reiniciar()` limpia los campos.
 */
@Component({
  selector: 'app-form-clave',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AlertBannerComponent, BotonComponent, FormFieldComponent],
  template: `
    <form class="fc" (submit)="$event.preventDefault(); enviar()" novalidate>
      <app-form-field [label]="etiquetaActual" [controlId]="id + '-actual'" [requerido]="true">
        <input [id]="id + '-actual'" type="password" autocomplete="current-password" [value]="actual()" (input)="actual.set(v($event))" />
      </app-form-field>
      <app-form-field label="Nueva contraseña" [controlId]="id + '-nueva'" [requerido]="true"
        ayuda="Mínimo 8 caracteres." [error]="intento() && !fuerte() ? 'Debe tener mínimo 8 caracteres y ser distinta a la actual.' : ''">
        <input [id]="id + '-nueva'" type="password" autocomplete="new-password" [value]="nueva()" (input)="nueva.set(v($event))" />
      </app-form-field>
      <app-form-field label="Confirma la nueva contraseña" [controlId]="id + '-confirmar'" [requerido]="true"
        [error]="intento() && !coincide() ? 'No coincide con la nueva contraseña.' : ''">
        <input [id]="id + '-confirmar'" type="password" autocomplete="new-password" [value]="confirmar()" (input)="confirmar.set(v($event))" />
      </app-form-field>
      @if (error) {
        <app-alert-banner variante="error" titulo="No se pudo cambiar">{{ error }}</app-alert-banner>
      }
      <div class="fc__acciones">
        <app-boton variante="accent" type="submit" icono="lock_reset" [disabled]="enviando">
          {{ enviando ? 'Guardando…' : textoBoton }}
        </app-boton>
      </div>
    </form>
  `,
  styles: [
    `
      .fc {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
      }
      .fc__acciones {
        display: flex;
        justify-content: flex-end;
      }
    `,
  ],
})
export class FormClaveComponent {
  @Input() id = 'clave';
  @Input() etiquetaActual = 'Contraseña actual';
  @Input() textoBoton = 'Cambiar contraseña';
  @Input() enviando = false;
  @Input() error = '';
  @Output() readonly guardar = new EventEmitter<CambioClave>();

  protected readonly actual = signal('');
  protected readonly nueva = signal('');
  protected readonly confirmar = signal('');
  protected readonly intento = signal(false);
  protected readonly fuerte = computed(() => CLAVE_FUERTE.test(this.nueva()) && this.nueva() !== this.actual());
  protected readonly coincide = computed(() => this.nueva() === this.confirmar());

  protected v(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  protected enviar(): void {
    this.intento.set(true);
    if (!this.actual() || !this.fuerte() || !this.coincide()) return;
    this.guardar.emit({ actual: this.actual(), nueva: this.nueva() });
  }

  reiniciar(): void {
    this.actual.set('');
    this.nueva.set('');
    this.confirmar.set('');
    this.intento.set(false);
  }
}
