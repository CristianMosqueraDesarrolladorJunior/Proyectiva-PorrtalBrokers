import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';

/** Pieza de confeti: posición, trayectoria y estilo como custom properties del CSS. */
interface Pieza {
  readonly id: number;
  readonly estilo: string;
  readonly forma: 'cinta' | 'cuadro' | 'circulo';
}

const CANTIDAD = 90;
const DURACION_TOTAL_MS = 4200;
const COLORES = [
  'var(--sb-primary)',
  'var(--color-accent)',
  'var(--sb-primary-fixed)',
  'var(--sb-tertiary)',
  'var(--color-success)',
  'var(--color-info)',
];
const FORMAS: readonly Pieza['forma'][] = ['cinta', 'cinta', 'cuadro', 'circulo'];

const azar = (min: number, max: number): number => min + Math.random() * (max - min);

/** Genera las piezas: estallan desde el centro superior y caen con giro y vaivén. */
export function generarConfeti(cantidad = CANTIDAD): Pieza[] {
  return Array.from({ length: cantidad }, (_, id) => ({
    id,
    forma: FORMAS[id % FORMAS.length],
    estilo: [
      `--x:${azar(-50, 50).toFixed(1)}vw`,
      `--alto:${azar(-34, -12).toFixed(1)}vh`,
      `--giro:${Math.round(azar(360, 1080)) * (id % 2 ? 1 : -1)}deg`,
      `--vaiven:${azar(-6, 6).toFixed(1)}vw`,
      `--retraso:${Math.round(azar(0, 350))}ms`,
      `--duracion:${Math.round(azar(2600, 3800))}ms`,
      `--escala:${azar(0.7, 1.2).toFixed(2)}`,
      `--color:${COLORES[id % COLORES.length]}`,
    ].join(';'),
  }));
}

/**
 * Estallido de confeti para los momentos de éxito (CSS puro, sin librerías). Se retira solo al
 * terminar, no recibe clics y no se muestra si el usuario pidió reducir el movimiento.
 */
@Component({
  selector: 'app-confeti',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './confeti.component.scss',
  template: `
    @if (piezas().length) {
      <div class="cf" aria-hidden="true">
        @for (p of piezas(); track p.id) {
          <i [class]="'cf__pieza cf__pieza--' + p.forma" [attr.style]="p.estilo"></i>
        }
      </div>
    }
  `,
})
export class ConfetiComponent {
  protected readonly piezas = signal<readonly Pieza[]>(
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches ? [] : generarConfeti(),
  );

  constructor() {
    const fin = setTimeout(() => this.piezas.set([]), DURACION_TOTAL_MS);
    inject(DestroyRef).onDestroy(() => clearTimeout(fin));
  }
}
