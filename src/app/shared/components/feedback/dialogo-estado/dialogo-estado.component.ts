import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';

import { BotonComponent } from '../../boton/boton.component';
import { IconComponent } from '../../icon/icon.component';
import { ConfetiComponent } from '../confeti/confeti.component';
import { ICONO_VARIANTE, type ConfiguracionAcciones, type VarianteResultado } from '../feedback.types';

/**
 * Diálogo de estado bloqueante (comportamiento tipo SweetAlert, sin la librería): icono animado,
 * título, mensaje y acciones centradas; el éxito se celebra con confeti. `role="dialog"` + `aria-modal`, foco inicial en la acción
 * principal, foco atrapado con Tab y retorno del foco al cerrar. Lo monta `AppComponent` una sola
 * vez enlazado a `FeedbackService`.
 */
@Component({
  selector: 'app-dialogo-estado',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BotonComponent, ConfetiComponent, IconComponent],
  styleUrl: './dialogo-estado.component.scss',
  template: `
    @if (abierto()) {
      @if (variante() === 'exito') {
        <app-confeti />
      }
      <div class="de__fondo" (click)="onFondo()">
        <section
          #panel
          [class]="'de de--' + variante()"
          role="dialog"
          aria-modal="true"
          aria-labelledby="de-titulo"
          aria-describedby="de-mensaje"
          (click)="$event.stopPropagation()"
          (keydown)="atraparFoco($event)"
        >
          <span class="de__icono" aria-hidden="true">
            <app-icon [nombre]="icono()" [tamano]="44" [relleno]="true" />
          </span>
          <h2 id="de-titulo" class="de__titulo">{{ titulo() }}</h2>
          <p id="de-mensaje" class="de__mensaje">{{ mensaje() }}</p>
          <div class="de__acciones">
            @if (acciones().cancelar; as texto) {
              <app-boton variante="ghost" (clicked)="cancelar.emit()">{{ texto }}</app-boton>
            }
            @if (acciones().confirmar; as texto) {
              <app-boton [variante]="acciones().reintentar ? 'outline' : 'primary'" (clicked)="confirmar.emit()">
                {{ texto }}
              </app-boton>
            }
            @if (acciones().reintentar; as texto) {
              <app-boton variante="primary" icono="refresh" (clicked)="reintentar.emit()">{{ texto }}</app-boton>
            }
          </div>
        </section>
      </div>
    }
  `,
})
export class DialogoEstadoComponent {
  readonly abierto = input(false);
  readonly variante = input<VarianteResultado>('info');
  readonly titulo = input('');
  readonly mensaje = input('');
  readonly acciones = input<ConfiguracionAcciones>({ confirmar: 'Entendido' });
  readonly cierrePorEsc = input(true);
  readonly cierrePorFondo = input(true);

  readonly confirmar = output<void>();
  readonly cancelar = output<void>();
  readonly reintentar = output<void>();
  readonly cerrar = output<void>();

  protected readonly icono = computed(() => ICONO_VARIANTE[this.variante()]);
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private focoPrevio: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const panel = this.panel()?.nativeElement;
      if (panel) {
        this.focoPrevio = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        // La acción principal es el último botón (reintentar o confirmar).
        this.botones(panel).at(-1)?.focus();
      } else if (this.focoPrevio) {
        this.focoPrevio.focus();
        this.focoPrevio = null;
      }
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.abierto() && this.cierrePorEsc()) {
      this.cerrar.emit();
    }
  }

  protected onFondo(): void {
    if (this.cierrePorFondo()) {
      this.cerrar.emit();
    }
  }

  protected atraparFoco(evento: KeyboardEvent): void {
    const panel = this.panel()?.nativeElement;
    if (evento.key !== 'Tab' || !panel) {
      return;
    }
    const botones = this.botones(panel);
    const primero = botones[0];
    const ultimo = botones.at(-1);
    if (!primero || !ultimo) {
      evento.preventDefault();
      return;
    }
    if (evento.shiftKey && document.activeElement === primero) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primero.focus();
    }
  }

  private botones(panel: HTMLElement): HTMLButtonElement[] {
    return Array.from(panel.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
  }
}
