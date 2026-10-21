import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { RequisitoRegistro } from '../../../../../core/models/onboarding.model';
import { BotonComponent, IconComponent } from '../../../../../shared/components';

/** Lo que el prospecto necesita para registrarse (copys del Brandbook: claros y cercanos). */
export const REQUISITOS_REGISTRO: readonly RequisitoRegistro[] = [
  { id: 'identidad', etiqueta: 'Documento de identidad', icono: 'badge', descripcion: 'Cédula o documento de tu empresa, legible y vigente.' },
  { id: 'rut', etiqueta: 'RUT con código CIIU 6820 o 6810', icono: 'description', descripcion: 'Tu RUT actualizado, con la actividad económica 6820 o 6810 visible.' },
  { id: 'banco', etiqueta: 'Certificación bancaria', icono: 'account_balance', descripcion: 'La cuenta donde te pagaremos tus comisiones.' },
  { id: 'pago', etiqueta: 'Autorización de pago', icono: 'payments', descripcion: 'El formato firmado que nos autoriza a pagar tus comisiones.' },
];

/**
 * Paso 1 del registro («Bienvenida»): explica de qué se trata el negocio y qué necesitas para registrarte, y espera tu
 * «Aceptar» antes de pedirte datos. Presentacional: recibe los requisitos por `input()` y avisa el «Aceptar» por `output()`.
 */
@Component({
  selector: 'app-paso-como-funciona',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BotonComponent, IconComponent],
  template: `
    <section class="pcf" aria-labelledby="pcf-titulo">
      <header class="pcf__cab">
        <span class="pcf__eyebrow">Paso 1 de 3</span>
        <h3 id="pcf-titulo" class="pcf__titulo">Bienvenida</h3>
      </header>

      <div class="pcf__negocio">
        <span class="pcf__negocio-icono" aria-hidden="true"><app-icon nombre="handshake" [tamano]="24" /></span>
        <p>
          <b>Vende pólizas de arrendamiento y gana por cada una.</b>
          Proyectiva es una agencia de seguros. Tú cotizas y radicas desde este portal, nosotros revisamos y expedimos la
          póliza, y recibes una comisión por cada póliza expedida.
        </p>
      </div>

      <div class="pcf__columnas">
        <div>
          <h4 class="pcf__subtitulo">Así de simple es empezar</h4>
          <ol class="pcf__pasos">
            <li><b>1. Cuéntanos quién eres.</b> Tus datos personales y una contraseña para tu cuenta.</li>
            <li><b>2. Sube tus documentos.</b> Los cuatro de la lista: tenerlos a la mano te ahorra tiempo.</li>
            <li><b>3. Nosotros nos encargamos.</b> Revisamos y te contactamos con el resultado; mientras tanto ya puedes cotizar y radicar.</li>
          </ol>
        </div>

        <div>
          <h4 class="pcf__subtitulo">Ten a la mano</h4>
          <ul class="pcf__lista">
            @for (r of requisitos(); track r.id) {
              <li class="pcf__item">
                <span class="pcf__icono" aria-hidden="true"><app-icon [nombre]="r.icono" [tamano]="20" /></span>
                <span><b>{{ r.etiqueta }}</b><small>{{ r.descripcion }}</small></span>
              </li>
            }
          </ul>
        </div>
      </div>

      <div class="pcf__acciones">
        <app-boton variante="accent" icono="arrow_forward" (clicked)="aceptar.emit()">Aceptar y continuar</app-boton>
      </div>
    </section>
  `,
  styles: [
    `
      .pcf {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
      }
      .pcf__cab {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        padding-bottom: var(--space-3);
        border-bottom: 1px solid var(--color-border);
      }
      .pcf__eyebrow {
        font-size: var(--text-caption);
        font-weight: var(--font-weight-semibold);
        color: var(--color-accent);
        text-transform: uppercase;
      }
      .pcf__titulo {
        margin: var(--space-0);
        font-family: var(--font-family-heading);
        font-size: var(--text-title);
        color: var(--color-text);
      }
      .pcf__negocio {
        display: flex;
        align-items: flex-start;
        gap: var(--space-3);
        padding: var(--space-4);
        border: 1px solid var(--sb-tint-accent-border);
        border-radius: var(--radius-xl);
        background: var(--sb-tint-accent-bg);
      }
      .pcf__negocio p {
        margin: var(--space-0);
        font-size: var(--text-body-sm);
        line-height: var(--line-height-normal);
        color: var(--color-muted);
      }
      .pcf__negocio b {
        display: block;
        margin-bottom: var(--space-1);
        font-size: var(--text-body);
        color: var(--color-text);
      }
      .pcf__negocio-icono,
      .pcf__icono {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: none;
        width: 40px;
        height: 40px;
        border-radius: var(--radius-full);
        background: var(--color-card);
        color: var(--color-accent);
      }
      .pcf__icono {
        width: 36px;
        height: 36px;
        background: var(--color-accent-light);
      }
      .pcf__columnas {
        display: grid;
        grid-template-columns: 1fr;
        gap: var(--space-4);
      }
      .pcf__subtitulo {
        margin: var(--space-4) var(--space-0) var(--space-3);
        font-family: var(--font-family-heading);
        font-size: var(--text-subtitle);
        color: var(--color-text);
      }
      .pcf__pasos,
      .pcf__lista {
        display: flex;
        flex-direction: column;
        margin: var(--space-0);
        padding: var(--space-0);
        list-style: none;
      }
      .pcf__pasos {
        gap: var(--space-3);
        font-size: var(--text-body-sm);
        color: var(--color-muted);
        line-height: var(--line-height-normal);
      }
      .pcf__pasos b {
        color: var(--color-text);
      }
      .pcf__lista {
        gap: var(--space-2);
      }
      .pcf__item {
        display: flex;
        align-items: flex-start;
        gap: var(--space-3);
        padding: var(--space-3);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        background: var(--color-card);
      }
      .pcf__item b {
        display: block;
        font-size: var(--text-body-sm);
        color: var(--color-text);
      }
      .pcf__item small {
        font-size: var(--text-caption);
        color: var(--color-muted);
      }
      .pcf__acciones {
        display: flex;
        justify-content: center;
        padding-top: var(--space-2);
      }
      /* Escritorio: dos columnas (pasos | requisitos) para no saturar la vista. */
      @media (min-width: 900px) {
        .pcf__columnas {
          grid-template-columns: 1fr 1fr;
        }
      }
    `,
  ],
})
export class PasoComoFuncionaComponent {
  /** Requisitos a listar. */
  readonly requisitos = input.required<readonly RequisitoRegistro[]>();
  /** El prospecto confirma y continúa a «Tus datos». */
  readonly aceptar = output<void>();
}
