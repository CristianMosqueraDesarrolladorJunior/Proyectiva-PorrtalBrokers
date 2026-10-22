import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import type { PerfilTour } from '../../../core/models/onboarding.model';
import { recorridoDeVista } from '../../../core/onboarding/guion-tour';
import { TourBienvenidaService } from '../../../core/onboarding/tour-bienvenida.service';
import { SessionService } from '../../../core/services/session.service';
import { BotonComponent, IconComponent } from '../../../shared/components';
import { FeedbackService } from '../../../shared/services/feedback/feedback.service';

/** Índice siguiente dentro de `0..total-1`. */
export function siguiente(indice: number, total: number): number {
  return Math.min(indice + 1, Math.max(total - 1, 0));
}

/** Índice anterior dentro de `0..total-1`. */
export function anterior(indice: number): number {
  return Math.max(indice - 1, 0);
}

/** Recuadro del elemento resaltado en coordenadas de la ventana. */
interface Recuadro {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

/** Primer elemento visible de la lista de selectores (en orden de preferencia). */
export function buscarObjetivo(selectores: readonly string[] | undefined, raiz: ParentNode = document): HTMLElement | null {
  for (const selector of selectores ?? []) {
    let elementos: NodeListOf<HTMLElement>;
    try {
      elementos = raiz.querySelectorAll<HTMLElement>(selector);
    } catch {
      continue;
    }
    for (const el of Array.from(elementos)) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return el;
    }
  }
  return null;
}

const MARGEN = 8;
const ANCHO_TARJETA = 384; // 12 × --space-7, el ancho de la tarjeta
const MOVIL = 640;

/**
 * Recorrido de cada vista: la primera vez que el usuario entra a una vista se abre solo, oscurece la pantalla, resalta
 * cada elemento que explica y no deja usar la plataforma hasta «Finalizar» u «Omitir». «Ver recorrido» lo repite en la
 * vista actual. El avance se recuerda por vista en este navegador.
 */
@Component({
  selector: 'app-recorrido-plataforma',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BotonComponent, IconComponent],
  host: { '(document:keydown)': 'tecla($event)', '(window:resize)': 'ubicar()' },
  template: `
    @if (tour.abierto() && paso(); as p) {
      <div class="rt" role="dialog" aria-modal="true" [attr.aria-label]="'Recorrido: ' + p.titulo">
        <!-- Bloquea la plataforma mientras dura el recorrido: primero se recorre, luego se usa. -->
        <div class="rt__bloqueo" [class.rt__bloqueo--oscuro]="!recuadro()" (click)="$event.stopPropagation()"></div>
        @if (recuadro(); as r) {
          <div class="rt__foco" aria-hidden="true"
            [style.top.px]="r.top - margen" [style.left.px]="r.left - margen"
            [style.width.px]="r.width + margen * 2" [style.height.px]="r.height + margen * 2"></div>
        }
        <section class="rt__tarjeta" tabindex="-1" aria-live="polite"
          [class.rt__tarjeta--centro]="!recuadro() && !movil()" [class.rt__tarjeta--movil]="movil()"
          [style.top.px]="libre() ? posicion().top : null" [style.left.px]="libre() ? posicion().left : null">
          <header class="rt__cab">
            <span class="rt__posicion">Paso {{ indice() + 1 }} de {{ total() }}</span>
            <div class="rt__progreso" aria-hidden="true">
              @for (_ of puntos(); track $index) {
                <span class="rt__punto" [class.rt__punto--activo]="$index <= indice()"></span>
              }
            </div>
          </header>
          <div class="rt__cuerpo">
            @if (p.icono) {
              <span class="rt__icono" aria-hidden="true"><app-icon [nombre]="p.icono" [tamano]="22" /></span>
            }
            <div>
              <h3 class="rt__titulo">{{ p.titulo }}</h3>
              <p class="rt__texto">{{ p.texto }}</p>
            </div>
          </div>
          <footer class="rt__acciones">
            <button type="button" class="rt__omitir" (click)="terminar(false)">Omitir recorrido</button>
            <span class="rt__nav">
              @if (indice() > 0) {
                <app-boton variante="outline" icono="arrow_back" (clicked)="ir(-1)">Anterior</app-boton>
              }
              <app-boton variante="accent" [icono]="esUltimo() ? 'check' : 'arrow_forward'" (clicked)="ir(1)">
                {{ esUltimo() ? 'Finalizar' : 'Siguiente' }}
              </app-boton>
            </span>
          </footer>
        </section>
      </div>
    }
  `,
  styles: [
    `
      .rt {
        position: fixed;
        inset: var(--space-0);
        z-index: var(--z-feedback-dialogo);
      }
      .rt__bloqueo {
        position: absolute;
        inset: var(--space-0);
        cursor: default;
      }
      .rt__bloqueo--oscuro {
        background: color-mix(in srgb, var(--sb-slate) 62%, transparent);
      }
      .rt__foco {
        position: fixed;
        border: 2px solid var(--color-accent);
        border-radius: var(--radius-xl);
        box-shadow: 0 0 0 100vmax color-mix(in srgb, var(--sb-slate) 62%, transparent);
        pointer-events: none;
        transition: top 0.2s ease, left 0.2s ease, width 0.2s ease, height 0.2s ease;
      }
      .rt__tarjeta {
        position: fixed;
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        width: min(calc(var(--space-7) * 12), calc(100vw - var(--space-4) * 2));
        padding: var(--space-4);
        border-radius: var(--radius-xl);
        background: var(--color-card);
        box-shadow: var(--shadow-modal);
      }
      .rt__tarjeta:focus-visible {
        outline: var(--focus-ring-width) solid var(--color-focus-ring);
        outline-offset: var(--focus-ring-offset);
      }
      .rt__tarjeta--centro {
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      }
      .rt__tarjeta--movil {
        right: var(--space-0);
        bottom: var(--space-0);
        left: var(--space-0);
        width: 100%;
        border-radius: var(--radius-xl) var(--radius-xl) var(--space-0) var(--space-0);
      }
      .rt__cab {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-3);
      }
      .rt__posicion {
        font-size: var(--text-caption);
        font-weight: var(--font-weight-semibold);
        color: var(--color-accent);
        text-transform: uppercase;
      }
      .rt__progreso {
        display: flex;
        gap: var(--space-1);
      }
      .rt__punto {
        width: var(--space-2);
        height: var(--space-2);
        border-radius: var(--radius-full);
        background: var(--color-border);
      }
      .rt__punto--activo {
        background: var(--color-accent);
      }
      .rt__cuerpo {
        display: flex;
        align-items: flex-start;
        gap: var(--space-3);
      }
      .rt__icono {
        display: inline-flex;
        flex: none;
        align-items: center;
        justify-content: center;
        width: var(--space-7);
        height: var(--space-7);
        border-radius: var(--radius-full);
        background: var(--color-accent-light);
        color: var(--color-accent);
      }
      .rt__titulo {
        margin: var(--space-0) var(--space-0) var(--space-1);
        font-family: var(--font-family-heading);
        font-size: var(--text-subtitle);
        color: var(--color-text);
      }
      .rt__texto {
        margin: var(--space-0);
        font-size: var(--text-body-sm);
        line-height: var(--line-height-normal);
        color: var(--color-muted);
      }
      .rt__acciones {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-2);
      }
      .rt__nav {
        display: flex;
        gap: var(--space-2);
        margin-left: auto;
      }
      .rt__omitir {
        padding: var(--space-1) var(--space-0);
        border: none;
        background: transparent;
        font-size: var(--text-body-sm);
        color: var(--color-muted);
        text-decoration: underline;
        cursor: pointer;
      }
      .rt__omitir:focus-visible {
        outline: var(--focus-ring-width) solid var(--color-focus-ring);
        outline-offset: var(--focus-ring-offset);
      }
    `,
  ],
})
export class RecorridoPlataformaComponent {
  protected readonly tour = inject(TourBienvenidaService);
  private readonly sesion = inject(SessionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly feedback = inject(FeedbackService);
  protected readonly margen = MARGEN;

  /** Perfil del recorrido según el rol y el estado de la cuenta; el analista documental no tiene recorrido. */
  protected readonly perfilTour = computed<PerfilTour | null>(() => {
    const p = this.sesion.perfil();
    if (!p) return null;
    if (p.rol === 'BROKER') return p.estadoCuenta === 'PROSPECTO' ? 'PROSPECTO' : 'BROKER';
    return p.rol === 'ADMINISTRADOR' || p.rol === 'COMERCIAL' ? p.rol : null;
  });
  private readonly pasos = computed(() => this.tour.guia()?.pasos ?? []);
  protected readonly indice = signal(0);
  protected readonly total = computed(() => this.pasos().length);
  protected readonly paso = computed(() => this.pasos()[this.indice()] ?? null);
  protected readonly esUltimo = computed(() => this.indice() >= this.total() - 1);
  protected readonly puntos = computed(() => Array.from({ length: this.total() }));
  protected readonly recuadro = signal<Recuadro | null>(null);
  protected readonly movil = signal(typeof window !== 'undefined' && window.innerWidth < MOVIL);
  protected readonly posicion = signal({ top: 0, left: 0 });
  /** La tarjeta se ubica junto al elemento solo en escritorio y con algo resaltado; si no, va centrada o abajo. */
  protected readonly libre = computed(() => !!this.recuadro() && !this.movil());
  private intentos = 0;

  constructor() {
    // Cada vista ofrece su recorrido (se abre solo la primera vez); la gestión de una renovación registra el suyo.
    effect(() => {
      if (this.perfilTour()) {
        queueMicrotask(() => this.ofrecerVista(this.router.url));
      }
    });
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((e) => this.ofrecerVista(e.urlAfterRedirects));
    // Al abrirse (solo o desde «Ver recorrido») arranca en el primer paso.
    effect(() => {
      if (this.tour.abierto() && this.total()) {
        this.indice.set(0);
        this.mostrar();
      }
    });
  }

  private clave(ruta: string): string {
    return `${this.perfilTour()}:${this.sesion.perfil()?.nombre ?? ''}:${ruta.split('?')[0]}`;
  }

  private ofrecerVista(url: string): void {
    const perfil = this.perfilTour();
    if (!perfil) return;
    const pasos = recorridoDeVista(perfil, url);
    if (pasos.length) {
      this.tour.registrarGuia(this.clave(url), pasos);
    } else if (this.tour.guia()?.clave.startsWith(`${perfil}:`)) {
      // Sale de una vista con recorrido hacia una sin él (la renovación registra el suyo propio).
      this.tour.limpiarGuia();
    }
  }

  protected ir(delta: 1 | -1): void {
    if (delta === 1 && this.esUltimo()) {
      this.terminar(true);
      return;
    }
    this.indice.update((i) => (delta === 1 ? siguiente(i, this.total()) : anterior(i)));
    this.mostrar();
  }

  /** Lleva el elemento del paso a la vista y lo resalta (espera a que la vista lo pinte). */
  private mostrar(): void {
    this.intentos = 0;
    this.recuadro.set(null);
    const intentar = (): void => {
      const objetivo = buscarObjetivo(this.paso()?.objetivo);
      if (!objetivo && this.paso()?.objetivo?.length && this.intentos++ < 20) {
        setTimeout(intentar, 50);
        return;
      }
      objetivo?.scrollIntoView({ block: 'center', inline: 'nearest' });
      requestAnimationFrame(() => {
        this.ubicar();
        document.querySelector<HTMLElement>('.rt__tarjeta')?.focus();
      });
    };
    queueMicrotask(intentar);
  }

  /** Recalcula el resaltado y la posición de la tarjeta (al mostrar un paso y al cambiar el tamaño de la ventana). */
  protected ubicar(): void {
    if (!this.tour.abierto()) return;
    const ancho = window.innerWidth;
    this.movil.set(ancho < MOVIL);
    const objetivo = buscarObjetivo(this.paso()?.objetivo);
    if (!objetivo) {
      this.recuadro.set(null);
      return;
    }
    const r = objetivo.getBoundingClientRect();
    // Un bloque más alto que la pantalla se resalta solo en su parte visible.
    const top = Math.max(r.top, MARGEN * 2);
    const bottom = Math.min(r.bottom, window.innerHeight - MARGEN * 2);
    this.recuadro.set({ top, left: r.left, width: r.width, height: Math.max(bottom - top, 0) });
    if (this.movil()) return;
    const tarjeta = document.querySelector<HTMLElement>('.rt__tarjeta');
    const alto = tarjeta?.offsetHeight ?? 220;
    const abajo = bottom + MARGEN * 3;
    const arriba = top - MARGEN * 3 - alto;
    const topTarjeta = abajo + alto < window.innerHeight ? abajo : arriba > 0 ? arriba : Math.max(window.innerHeight - alto - MARGEN * 2, MARGEN * 2);
    const left = Math.min(Math.max(r.left, MARGEN * 2), ancho - ANCHO_TARJETA - MARGEN * 2);
    this.posicion.set({ top: topTarjeta, left: Math.max(left, MARGEN * 2) });
  }

  /** Esc omite; las flechas avanzan o retroceden. */
  protected tecla(e: KeyboardEvent): void {
    if (!this.tour.abierto()) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      this.terminar(false);
    } else if (e.key === 'ArrowRight') {
      this.ir(1);
    } else if (e.key === 'ArrowLeft') {
      this.ir(-1);
    }
  }

  /** Finalizar u omitir: se cierra y la vista queda como vista (no se vuelve a abrir sola). */
  protected terminar(completo: boolean): void {
    const guia = this.tour.guia();
    this.tour.cerrar();
    this.recuadro.set(null);
    if (guia) this.tour.marcarGuiaVista(guia.clave);
    if (completo) {
      this.feedback.toast({ variante: 'info', mensaje: 'Listo. Puedes repetir este recorrido cuando quieras desde «Ver recorrido».' });
    }
  }
}
