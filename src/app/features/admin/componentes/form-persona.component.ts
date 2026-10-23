import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';

import type { PersonaRequest } from '../../../core/models/consola.model';
import { BotonComponent, FormFieldComponent } from '../../../shared/components';
import { SoloDigitosDirective } from '../../../shared/directives/solo-digitos.directive';

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Alta de una persona en la consola (prospecto o comercial): nombre, cédula, correo y teléfono, con
 * las mismas reglas que valida el backend. Al enviar, el servidor genera la credencial.
 */
@Component({
  selector: 'app-form-persona',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SoloDigitosDirective, BotonComponent, FormFieldComponent],
  template: `
    <form class="fp" (submit)="$event.preventDefault(); enviarSiValido()" novalidate>
      <app-form-field class="fp__ancho" label="Nombre completo" controlId="fp-nombre" [requerido]="true" [error]="error('nombre')">
        <input id="fp-nombre" type="text" autocomplete="off" maxlength="160" [value]="nombre()" (input)="nombre.set(v($event))" />
      </app-form-field>
      <app-form-field label="Cédula" controlId="fp-documento" [requerido]="true" [error]="error('documento')">
        <input appSoloDigitos id="fp-documento" type="text" inputmode="numeric" autocomplete="off" maxlength="12" [value]="documento()" (input)="documento.set(v($event))" />
      </app-form-field>
      <app-form-field label="Teléfono celular" controlId="fp-telefono" [requerido]="true" [error]="error('telefono')">
        <input id="fp-telefono" type="tel" autocomplete="off" maxlength="10" [value]="telefono()" (input)="telefono.set(v($event))" />
      </app-form-field>
      <app-form-field class="fp__ancho" label="Correo" controlId="fp-correo" [requerido]="true" [ayuda]="ayudaCorreo" [error]="error('correo')">
        <input id="fp-correo" type="email" autocomplete="off" maxlength="254" [value]="correo()" (input)="correo.set(v($event))" />
      </app-form-field>
      @if (conComision) {
        <app-form-field label="Comisión del comercial (%)" controlId="fp-comision" [error]="error('comision')"
          ayuda="Sobre la prima sin IVA de las pólizas de su cartera. Puedes cambiarla después.">
          <input id="fp-comision" type="text" inputmode="decimal" autocomplete="off" maxlength="6" [value]="comision()" (input)="comision.set(v($event))" />
        </app-form-field>
      }
      <div class="fp__acciones">
        <app-boton variante="accent" type="submit" [icono]="icono" [disabled]="enviando">{{ enviando ? 'Creando…' : textoBoton }}</app-boton>
      </div>
    </form>
  `,
  styles: [
    `
      .fp {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--space-4);
      }
      .fp__ancho,
      .fp__acciones {
        grid-column: 1 / -1;
      }
      .fp__acciones {
        display: flex;
        justify-content: flex-end;
      }
      @media (max-width: 640px) {
        .fp {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class FormPersonaComponent {
  @Input() textoBoton = 'Crear y generar credenciales';
  @Input() icono = 'key';
  @Input() ayudaCorreo = '';
  @Input() enviando = false;
  /** Alta de comercial: pide su porcentaje de comisión. */
  @Input() conComision = false;
  @Output() readonly enviar = new EventEmitter<PersonaRequest>();

  protected readonly nombre = signal('');
  protected readonly documento = signal('');
  protected readonly correo = signal('');
  protected readonly telefono = signal('');
  protected readonly comision = signal('0');
  private readonly intento = signal(false);

  private readonly errores = computed<Readonly<Record<string, string>>>(() => ({
    nombre: this.nombre().trim().length < 3 ? 'Escribe el nombre completo.' : '',
    documento: /^\d{6,12}$/.test(this.documento().trim()) ? '' : 'Cédula de 6 a 12 dígitos.',
    telefono: /^\d{7,10}$/.test(this.telefono().trim()) ? '' : 'Celular de 7 a 10 dígitos.',
    correo: CORREO.test(this.correo().trim()) ? '' : 'Correo no válido.',
    comision: !this.conComision || porcentajeValido(this.comision()) ? '' : 'Escribe un porcentaje de 0 a 100.',
  }));

  protected error(campo: string): string {
    return this.intento() ? this.errores()[campo] : '';
  }

  protected v(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  protected enviarSiValido(): void {
    this.intento.set(true);
    if (Object.values(this.errores()).some(Boolean)) return;
    this.enviar.emit({
      nombre: this.nombre().trim(),
      documento: this.documento().trim(),
      correo: this.correo().trim().toLowerCase(),
      telefono: this.telefono().trim(),
      ...(this.conComision ? { porcentajeComision: Number(this.comision().trim().replace(',', '.')) } : {}),
    });
  }
}

/** 0 a 100, con hasta dos decimales (coma o punto). */
export function porcentajeValido(texto: string): boolean {
  const t = texto.trim().replace(',', '.');
  return /^\d{1,3}(\.\d{1,2})?$/.test(t) && Number(t) <= 100;
}
