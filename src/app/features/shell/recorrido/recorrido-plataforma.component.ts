import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import type { PerfilTour } from '../../../core/models/onboarding.model';
import { guionDePerfil } from '../../../core/onboarding/guion-tour';
import { TourBienvenidaService } from '../../../core/onboarding/tour-bienvenida.service';
import { OnboardingService } from '../../../core/services/onboarding.service';
import { RenovacionService } from '../../../core/services/renovacion.service';
import { ordenarPorUrgencia } from '../../renovacion/renovaciones-lista';
import { SessionService } from '../../../core/services/session.service';
import { BotonComponent, IconComponent } from '../../../shared/components';

/** Índice siguiente dentro de `0..total-1`. */
export function siguiente(indice: number, total: number): number {
  return Math.min(indice + 1, Math.max(total - 1, 0));
}

/** Índice anterior dentro de `0..total-1`. */
export function anterior(indice: number): number {
  return Math.max(indice - 1, 0);
}

/**
 * Recorrido básico por la plataforma: una tarjeta flotante que lleva al usuario por cada vista real, una a una, con una
 * frase de lo que se hace allí. No tapa la pantalla (se ve la vista detrás) y siempre se puede salir. Se abre solo en el
 * primer ingreso y se reabre desde «Ver recorrido»; al terminar o salir se marca como visto y vuelve a la vista inicial.
 */
@Component({
  selector: 'app-recorrido-plataforma',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BotonComponent, IconComponent],
  template: `
    @if (tour.abierto() && paso(); as p) {
      <aside class="rp" role="dialog" [attr.aria-label]="tour.guia() ? 'Guía de esta vista' : 'Recorrido por la plataforma'" aria-live="polite">
        <header class="rp__cab">
          <span class="rp__posicion">{{ tour.guia() ? 'Guía' : 'Vista' }} {{ indice() + 1 }} de {{ total() }}</span>
          <button type="button" class="rp__cerrar" aria-label="Salir del recorrido" (click)="terminar()">
            <app-icon nombre="close" [tamano]="18" />
          </button>
        </header>
        <div class="rp__cuerpo">
          @if (p.icono) {
            <span class="rp__icono" aria-hidden="true"><app-icon [nombre]="p.icono" [tamano]="22" /></span>
          }
          <div>
            <h3 class="rp__titulo">{{ p.titulo }}</h3>
            <p class="rp__texto">{{ p.texto }}</p>
          </div>
        </div>
        <footer class="rp__acciones">
          <app-boton variante="outline" icono="close" (clicked)="terminar()">Salir del recorrido</app-boton>
          <app-boton variante="outline" icono="arrow_back" [disabled]="indice() === 0" (clicked)="ir(-1)">Anterior</app-boton>
          <app-boton variante="accent" [icono]="esUltimo() ? 'check' : 'arrow_forward'" (clicked)="ir(1)">
            {{ esUltimo() ? 'Finalizar' : 'Siguiente' }}
          </app-boton>
        </footer>
      </aside>
    }
  `,
  styles: [
    `
      .rp {
        position: fixed;
        right: var(--space-5);
        bottom: var(--space-5);
        z-index: var(--z-feedback-dialogo);
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        width: min(380px, calc(100vw - var(--space-5) * 2));
        padding: var(--space-4);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-xl);
        background: var(--color-card);
        box-shadow: var(--shadow-modal);
      }
      .rp__cab {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .rp__posicion {
        font-size: var(--text-caption);
        font-weight: var(--font-weight-semibold);
        color: var(--color-accent);
        text-transform: uppercase;
      }
      .rp__cerrar {
        display: inline-flex;
        padding: var(--space-1);
        border: none;
        border-radius: var(--radius-full);
        background: transparent;
        color: var(--color-muted);
        cursor: pointer;
      }
      .rp__cerrar:focus-visible {
        outline: var(--focus-ring-width) solid var(--color-focus-ring);
        outline-offset: var(--focus-ring-offset);
      }
      .rp__cuerpo {
        display: flex;
        align-items: flex-start;
        gap: var(--space-3);
      }
      .rp__icono {
        display: inline-flex;
        flex: none;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: var(--radius-full);
        background: var(--color-accent-light);
        color: var(--color-accent);
      }
      .rp__titulo {
        margin: var(--space-0) var(--space-0) var(--space-1);
        font-family: var(--font-family-heading);
        font-size: var(--text-subtitle);
        color: var(--color-text);
      }
      .rp__texto {
        margin: var(--space-0);
        font-size: var(--text-body-sm);
        line-height: var(--line-height-normal);
        color: var(--color-muted);
      }
      .rp__acciones {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: var(--space-2);
      }
    `,
  ],
})
export class RecorridoPlataformaComponent {
  protected readonly tour = inject(TourBienvenidaService);
  private readonly onboarding = inject(OnboardingService);
  private readonly renovaciones = inject(RenovacionService);
  private readonly sesion = inject(SessionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private consultado = false;
  private yaVisto = true;
  private inicio: string | null = null;

  /** Perfil del recorrido según el rol y el estado de la cuenta; el analista documental no tiene recorrido. */
  protected readonly perfilTour = computed<PerfilTour | null>(() => {
    const p = this.sesion.perfil();
    if (!p) return null;
    if (p.rol === 'BROKER') return p.estadoCuenta === 'PROSPECTO' ? 'PROSPECTO' : 'BROKER';
    return p.rol === 'ADMINISTRADOR' || p.rol === 'COMERCIAL' ? p.rol : null;
  });
  private readonly pasos = computed(() => {
    const guia = this.tour.guia();
    if (guia) return guia.pasos;
    const perfil = this.perfilTour();
    return perfil ? guionDePerfil(perfil).pasos : [];
  });
  protected readonly indice = signal(0);
  protected readonly total = computed(() => this.pasos().length);
  protected readonly paso = computed(() => this.pasos()[this.indice()] ?? null);
  protected readonly esUltimo = computed(() => this.indice() >= this.total() - 1);

  constructor() {
    // Primer ingreso: pregunta al backend si ya lo vio y, si no, lo abre.
    effect(() => {
      if (this.perfilTour() && !this.consultado && !this.tour.guia()) {
        this.consultado = true;
        this.onboarding
          .consultarEstado()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (estado) => {
              this.yaVisto = estado.tourVisto;
              if (!estado.tourVisto) this.tour.abrir();
            },
            error: () => undefined,
          });
      }
    });
    // Cada vez que se abre arranca en la primera vista, recordando dónde estaba el usuario.
    effect(() => {
      if (this.tour.abierto() && this.pasos().length) {
        this.indice.set(0);
        this.inicio = this.router.url;
        this.mostrar(0);
      }
    });
  }

  protected ir(delta: 1 | -1): void {
    if (delta === 1 && this.esUltimo()) {
      this.terminar();
      return;
    }
    this.indice.update((i) => (delta === 1 ? siguiente(i, this.total()) : anterior(i)));
    this.mostrar(this.indice());
  }

  /** Lleva a la vista real del paso. */
  private mostrar(i: number): void {
    const paso = this.pasos()[i];
    if (paso?.abrir === 'primeraRenovacion') {
      this.abrirPrimeraRenovacion();
      return;
    }
    const ruta = paso?.ruta;
    if (ruta && this.router.url.split('?')[0] !== ruta) {
      void this.router.navigateByUrl(ruta);
    }
  }

  /** Entra a la gestión de la primera póliza que se puede renovar; si no hay ninguna, sigue con el paso siguiente. */
  private abrirPrimeraRenovacion(): void {
    this.renovaciones
      .portafolio()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (portafolio) => {
          const poliza = ordenarPorUrgencia(portafolio.polizas).find(
            (p) => !['VENCIDA', 'RENOVADA', 'NO_RENOVADA'].includes(p.estado),
          );
          if (poliza) {
            void this.router.navigateByUrl(`/app/renovaciones/detalle?numeroPolizaInicial=${encodeURIComponent(poliza.numero)}`);
          } else {
            this.ir(1);
          }
        },
        error: () => this.ir(1),
      });
  }

  /** Finalizar o salir: cierra, vuelve a donde estaba el usuario y, la primera vez, lo marca como visto. */
  protected terminar(): void {
    this.tour.cerrar();
    const guia = this.tour.guia();
    if (guia) {
      // La guía de una vista no navega: solo se recuerda que ya se vio.
      this.tour.marcarGuiaVista(guia.clave);
      return;
    }
    if (this.inicio && this.router.url !== this.inicio) {
      void this.router.navigateByUrl(this.inicio);
    }
    if (!this.yaVisto) {
      this.yaVisto = true;
      this.onboarding.marcarVisto().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ error: () => undefined });
    }
  }
}
