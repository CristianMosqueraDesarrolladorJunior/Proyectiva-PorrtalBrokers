import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { FeedbackService } from '../../../services/feedback/feedback.service';
import { IconComponent } from '../../icon/icon.component';
import { ICONO_VARIANTE } from '../feedback.types';

/**
 * Pila de toasts no bloqueantes (esquina superior derecha; ancho completo en móvil).
 * La región `aria-live` existe siempre para que el lector anuncie cada toast nuevo;
 * los de error usan `role="alert"`. Se monta una vez en `AppComponent`.
 */
@Component({
  selector: 'app-toast-host',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  styleUrl: './toast-host.component.scss',
  template: `
    <div class="th" aria-live="polite" aria-relevant="additions">
      @for (t of toasts(); track t.id) {
        <div [class]="'th__toast th__toast--' + t.variante" [attr.role]="t.variante === 'error' ? 'alert' : null">
          <app-icon class="th__icono" [nombre]="iconos[t.variante]" [tamano]="22" [relleno]="true" />
          <p class="th__texto">
            @if (t.titulo) {
              <strong class="th__titulo">{{ t.titulo }}</strong>
            }
            {{ t.mensaje }}
          </p>
          <button type="button" class="th__cerrar" aria-label="Cerrar notificación" (click)="feedback.cerrar(t.id)">
            <app-icon nombre="close" [tamano]="18" />
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastHostComponent {
  protected readonly feedback = inject(FeedbackService);
  protected readonly toasts = this.feedback.toasts;
  protected readonly iconos = ICONO_VARIANTE;
}
