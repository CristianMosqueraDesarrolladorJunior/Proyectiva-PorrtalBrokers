import { Injectable, signal } from '@angular/core';

import type { PasoTour } from '../models/onboarding.model';

/** Guía de una vista concreta (p. ej. la gestión de una renovación): sus pasos explican lo que hay en pantalla. */
export interface GuiaContextual {
  readonly clave: string;
  readonly pasos: readonly PasoTour[];
}

const PREFIJO_VISTA = 'recorrido-visto:';

/**
 * Estado compartido del recorrido: el primer ingreso lo abre solo; «Ver recorrido» del menú lo reabre bajo demanda. Una
 * vista puede registrar su propia guía: se abre sola la primera vez (se recuerda en este navegador) y «Ver recorrido»
 * la reabre mientras el usuario está en esa vista.
 */
@Injectable({ providedIn: 'root' })
export class TourBienvenidaService {
  private readonly _abierto = signal(false);
  private readonly _guia = signal<GuiaContextual | null>(null);
  readonly abierto = this._abierto.asReadonly();
  readonly guia = this._guia.asReadonly();

  abrir(): void {
    this._abierto.set(true);
  }

  cerrar(): void {
    this._abierto.set(false);
  }

  /** La vista actual ofrece su guía; si es la primera vez en este navegador, se abre sola. */
  registrarGuia(clave: string, pasos: readonly PasoTour[]): void {
    // Con el recorrido general en curso, este ya recorre esta vista: no se superpone otra guía.
    if (this._abierto()) {
      return;
    }
    this._guia.set({ clave, pasos });
    if (!this.guiaVista(clave)) {
      this._abierto.set(true);
    }
  }

  /** La vista se cierra: vuelve el recorrido general. */
  limpiarGuia(): void {
    if (!this._guia()) {
      return;
    }
    this._guia.set(null);
    this._abierto.set(false);
  }

  marcarGuiaVista(clave: string): void {
    try {
      localStorage.setItem(PREFIJO_VISTA + clave, '1');
    } catch {
      // Sin almacenamiento: la guía simplemente se ofrecerá de nuevo.
    }
  }

  private guiaVista(clave: string): boolean {
    try {
      return localStorage.getItem(PREFIJO_VISTA + clave) === '1';
    } catch {
      return false;
    }
  }
}
