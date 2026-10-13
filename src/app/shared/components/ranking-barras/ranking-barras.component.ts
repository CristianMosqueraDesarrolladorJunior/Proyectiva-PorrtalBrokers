import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';

import { IconComponent } from '../icon/icon.component';

/** Fila de un ranking: etiqueta, valor numérico y, opcionalmente, el valor ya formateado. */
export interface ItemRanking {
  readonly etiqueta: string;
  readonly valor: number;
  /** Texto a mostrar (p. ej. "$1,2 M"); si falta se muestra `valor`. */
  readonly valorTexto?: string;
}

/**
 * Panel de ranking con barras horizontales proporcionales al mayor valor.
 * Sirve para radicados por comercial, producción por broker, comisiones, etc.
 * Mismo lenguaje visual que `app-info-list-card`.
 */
@Component({
  selector: 'app-ranking-barras',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <section class="rb">
      <header class="rb__cab">
        @if (icono) {
          <span class="rb__icono" aria-hidden="true"><app-icon [nombre]="icono" [tamano]="20" /></span>
        }
        <div>
          @if (etiqueta) {
            <span class="rb__etiqueta">{{ etiqueta }}</span>
          }
          <h3 class="rb__titulo">{{ titulo }}</h3>
        </div>
      </header>
      @if (filas().length > 0) {
        <ol class="rb__lista">
          @for (item of filas(); track item.etiqueta; let i = $index) {
            <li class="rb__fila">
              <div class="rb__texto">
                <span class="rb__posicion" aria-hidden="true">{{ i + 1 }}</span>
                <span class="rb__nombre">{{ item.etiqueta }}</span>
                <strong class="rb__valor">{{ item.valorTexto ?? item.valor }}</strong>
              </div>
              <div class="rb__pista" aria-hidden="true">
                <div class="rb__barra" [style.width.%]="porcentaje(item.valor)"></div>
              </div>
            </li>
          }
        </ol>
      } @else {
        <p class="rb__vacio">{{ mensajeVacio }}</p>
      }
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .rb {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
        padding: var(--card-padding);
        border: 1px solid var(--sb-border);
        border-radius: var(--radius-xl);
        background: var(--sb-surface);
        box-shadow: var(--sb-shadow-1);
      }
      .rb__cab {
        display: flex;
        align-items: center;
        gap: var(--space-3);
      }
      .rb__icono {
        display: inline-grid;
        place-items: center;
        flex-shrink: 0;
        width: var(--icon-badge-size);
        height: var(--icon-badge-size);
        border-radius: var(--radius-md);
        background: var(--sb-primary);
        color: var(--sb-on-primary);
      }
      .rb__etiqueta {
        font-size: var(--text-caption);
        font-weight: var(--font-weight-bold);
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--sb-primary-hover);
      }
      .rb__titulo {
        margin: 0;
        font-size: var(--text-subtitle);
        font-weight: var(--font-weight-semibold);
        color: var(--sb-on-surface);
      }
      .rb__lista {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .rb__fila {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }
      .rb__texto {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        font-size: var(--text-body);
      }
      .rb__posicion {
        display: inline-grid;
        place-items: center;
        width: var(--space-6);
        height: var(--space-6);
        border-radius: var(--radius-full);
        background: var(--sb-surface-container);
        font-size: var(--text-caption);
        font-weight: var(--font-weight-bold);
        color: var(--sb-secondary);
      }
      .rb__nombre {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        color: var(--sb-on-surface);
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .rb__valor {
        font-weight: var(--font-weight-bold);
        color: var(--sb-on-surface);
      }
      .rb__pista {
        height: var(--space-2);
        overflow: hidden;
        border-radius: var(--radius-pill);
        background: var(--sb-surface-low);
      }
      .rb__barra {
        height: 100%;
        border-radius: var(--radius-pill);
        background: var(--gradient-accent);
        transition: width var(--duration-slow) var(--ease-out);
      }
      .rb__vacio {
        margin: 0;
        color: var(--sb-secondary);
      }
    `,
  ],
})
export class RankingBarrasComponent {
  @Input({ required: true }) titulo = '';
  @Input() etiqueta: string | null = null;
  @Input() icono: string | null = 'leaderboard';
  @Input() mensajeVacio = 'Aún no hay datos para mostrar.';

  @Input()
  set items(valor: readonly ItemRanking[]) {
    this._items.set(valor ?? []);
  }

  private readonly _items = signal<readonly ItemRanking[]>([]);

  /** Ordenadas de mayor a menor. */
  protected readonly filas = computed(() => [...this._items()].sort((a, b) => b.valor - a.valor));

  private readonly maximo = computed(() => Math.max(1, ...this._items().map((i) => i.valor)));

  protected porcentaje(valor: number): number {
    return Math.max(2, (valor / this.maximo()) * 100);
  }
}
