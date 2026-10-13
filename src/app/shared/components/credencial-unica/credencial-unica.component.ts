import { ChangeDetectionStrategy, Component, Input, signal } from '@angular/core';

import { AlertBannerComponent } from '../alert-banner/alert-banner.component';
import { BotonComponent } from '../boton/boton.component';

/**
 * Credencial generada por el portal: se muestra UNA sola vez para copiarla y entregarla. El usuario
 * debe cambiarla en su primer ingreso; el portal no la guarda en claro ni la puede volver a mostrar.
 */
@Component({
  selector: 'app-credencial-unica',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AlertBannerComponent, BotonComponent],
  template: `
    <app-alert-banner variante="warning" titulo="Cópiala ahora: no se volverá a mostrar" icono="key">
      Entrégala por un canal seguro. Al primer ingreso se le pedirá cambiarla.
    </app-alert-banner>
    <div class="cu">
      <div class="cu__fila">
        <span class="cu__etiqueta">Usuario</span>
        <code class="cu__valor">{{ usuario }}</code>
        <app-boton variante="ghost" icono="content_copy" [ariaLabel]="'Copiar usuario'" (clicked)="copiar(usuario, 'usuario')" />
      </div>
      <div class="cu__fila">
        <span class="cu__etiqueta">Contraseña temporal</span>
        <code class="cu__valor cu__valor--clave">{{ credencial }}</code>
        <app-boton variante="ghost" icono="content_copy" [ariaLabel]="'Copiar contraseña'" (clicked)="copiar(credencial, 'clave')" />
      </div>
      @if (copiado()) {
        <span class="cu__copiado" role="status">{{ copiado() === 'clave' ? 'Contraseña copiada' : 'Usuario copiado' }}</span>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
      }
      .cu {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        padding: var(--space-4);
        border: 1px dashed var(--sb-tertiary);
        border-radius: var(--radius-lg);
        background: var(--sb-surface-low);
      }
      .cu__fila {
        display: grid;
        grid-template-columns: 160px minmax(0, 1fr) auto;
        align-items: center;
        gap: var(--space-3);
      }
      .cu__etiqueta {
        font-size: var(--text-caption);
        color: var(--sb-secondary);
      }
      .cu__valor {
        font-family: var(--font-mono, ui-monospace, monospace);
        font-size: var(--text-subtitle);
        color: var(--sb-on-surface);
        overflow-wrap: anywhere;
      }
      .cu__valor--clave {
        font-weight: var(--font-weight-bold);
        letter-spacing: 0.04em;
      }
      .cu__copiado {
        font-size: var(--text-caption);
        color: var(--sb-tertiary);
      }
    `,
  ],
})
export class CredencialUnicaComponent {
  @Input({ required: true }) usuario = '';
  @Input({ required: true }) credencial = '';

  protected readonly copiado = signal<'' | 'usuario' | 'clave'>('');

  protected copiar(texto: string, que: 'usuario' | 'clave'): void {
    void navigator.clipboard?.writeText(texto).then(() => this.copiado.set(que));
  }
}
