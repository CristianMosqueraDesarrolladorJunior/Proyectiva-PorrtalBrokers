import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { PARTE_EXTRA_VACIA } from '../../../../core/models/contrato.model';
import type {
  ApoderadoContrato,
  ParteExtra,
  RepresentanteLegalContrato,
  TipoPersonaContrato,
} from '../../../../core/models/contrato.model';
import { FormFieldComponent } from '../../../../shared/components';
import type { OpcionIdentificacion } from '../../pages/contrato/contrato-presentacion';

const REP_VACIO: RepresentanteLegalContrato = { nombre: '', tipoIdentificacion: 'CC', numeroIdentificacion: '' };
const APO_VACIO: ApoderadoContrato = { nombre: '', tipoIdentificacion: 'CC', numeroIdentificacion: '' };

/**
 * Persona jurídica (con su representante legal) y apoderado de una parte del contrato, con los mismos campos que
 * el generador de referencia. Se usa para el arrendador, el arrendatario y los coarrendadores.
 */
@Component({
  selector: 'app-parte-extra',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, FormFieldComponent],
  template: `
    <app-form-field label="¿Es persona natural o jurídica?" [requerido]="true" [controlId]="prefijo() + '-tipo-persona'">
      <select
        [id]="prefijo() + '-tipo-persona'"
        [ngModel]="valor().tipoPersona"
        (ngModelChange)="cambiarTipo($event)"
      >
        <option value="NATURAL">Persona natural</option>
        <option value="JURIDICA">Persona jurídica (empresa)</option>
      </select>
    </app-form-field>

    @if (valor().tipoPersona === 'JURIDICA') {
      <p class="pe-ayuda">Escribe la razón social en «Nombres» y el NIT como identificación. Firma su representante legal.</p>
      <app-form-field label="Representante legal: nombre completo" [requerido]="true" [controlId]="prefijo() + '-rep-nombre'">
        <input [id]="prefijo() + '-rep-nombre'" type="text" autocomplete="off"
          [ngModel]="valor().representanteLegal?.nombre ?? ''" (ngModelChange)="rep({ nombre: $event })" />
      </app-form-field>
      <app-form-field label="Representante legal: tipo de documento" [requerido]="true" [controlId]="prefijo() + '-rep-tipo'">
        <select [id]="prefijo() + '-rep-tipo'" [ngModel]="valor().representanteLegal?.tipoIdentificacion ?? 'CC'"
          (ngModelChange)="rep({ tipoIdentificacion: $event })">
          @for (t of tipos(); track t.valor) { <option [value]="t.valor">{{ t.etiqueta }}</option> }
        </select>
      </app-form-field>
      <app-form-field label="Representante legal: número de documento" [requerido]="true" [controlId]="prefijo() + '-rep-num'">
        <input [id]="prefijo() + '-rep-num'" type="text" inputmode="numeric" autocomplete="off"
          [ngModel]="valor().representanteLegal?.numeroIdentificacion ?? ''" (ngModelChange)="rep({ numeroIdentificacion: $event })" />
      </app-form-field>
    }

    <label class="pe-check">
      <input type="checkbox" [checked]="valor().apoderado !== null" (change)="conApoderado($any($event.target).checked)" />
      Firma por medio de un apoderado
    </label>
    @if (valor().apoderado; as a) {
      <app-form-field label="Apoderado: nombre completo" [requerido]="true" [controlId]="prefijo() + '-apo-nombre'">
        <input [id]="prefijo() + '-apo-nombre'" type="text" autocomplete="off" [ngModel]="a.nombre"
          (ngModelChange)="apo({ nombre: $event })" />
      </app-form-field>
      <app-form-field label="Apoderado: tipo de documento" [requerido]="true" [controlId]="prefijo() + '-apo-tipo'">
        <select [id]="prefijo() + '-apo-tipo'" [ngModel]="a.tipoIdentificacion" (ngModelChange)="apo({ tipoIdentificacion: $event })">
          @for (t of tipos(); track t.valor) { <option [value]="t.valor">{{ t.etiqueta }}</option> }
        </select>
      </app-form-field>
      <app-form-field label="Apoderado: número de documento" [requerido]="true" [controlId]="prefijo() + '-apo-num'">
        <input [id]="prefijo() + '-apo-num'" type="text" inputmode="numeric" autocomplete="off"
          [ngModel]="a.numeroIdentificacion" (ngModelChange)="apo({ numeroIdentificacion: $event })" />
      </app-form-field>
    }
  `,
  styles: [
    `
      .pe-ayuda { font-size: var(--text-caption); color: var(--color-muted); margin: 0 0 var(--space-2); }
      .pe-check { display: flex; gap: var(--space-2); align-items: center; margin: var(--space-2) 0; }
    `,
  ],
})
export class ParteExtraComponent {
  readonly valor = model<ParteExtra>(PARTE_EXTRA_VACIA);
  readonly tipos = input.required<readonly OpcionIdentificacion[]>();
  /** Prefijo de los ids (único por parte en la página). */
  readonly prefijo = input.required<string>();

  protected cambiarTipo(tipoPersona: TipoPersonaContrato): void {
    this.valor.update((v) => ({
      ...v,
      tipoPersona,
      representanteLegal: tipoPersona === 'JURIDICA' ? (v.representanteLegal ?? REP_VACIO) : null,
    }));
  }

  protected rep(cambio: Partial<RepresentanteLegalContrato>): void {
    this.valor.update((v) => ({ ...v, representanteLegal: { ...(v.representanteLegal ?? REP_VACIO), ...cambio } }));
  }

  protected conApoderado(si: boolean): void {
    this.valor.update((v) => ({ ...v, apoderado: si ? (v.apoderado ?? APO_VACIO) : null }));
  }

  protected apo(cambio: Partial<ApoderadoContrato>): void {
    this.valor.update((v) => ({ ...v, apoderado: { ...(v.apoderado ?? APO_VACIO), ...cambio } }));
  }
}
