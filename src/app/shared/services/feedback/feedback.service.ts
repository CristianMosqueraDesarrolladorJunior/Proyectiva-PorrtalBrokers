import { Injectable, signal } from '@angular/core';

import type {
  EstadoCarga,
  EstadoDialogo,
  IdFeedback,
  OpcionesCarga,
  OpcionesDialogo,
  OpcionesToast,
  ResultadoDialogo,
  Toast,
  VarianteResultado,
} from '../../components/feedback/feedback.types';

const AUTO_CIERRE_TOAST_MS = 5000;

/**
 * Fachada imperativa del feedback de estado (carga, éxito, error, info y toasts).
 * Guarda el estado en signals que leen los hosts montados una vez en `AppComponent`.
 * No persiste nada en el navegador.
 *
 * ```ts
 * feedback.exito({ titulo: '¡Listo!', mensaje: 'Tu solicitud quedó radicada.' });
 * feedback.toast({ variante: 'exito', mensaje: 'Datos actualizados.' });
 * ```
 */
@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private secuencia = 0;
  private readonly temporizadores = new Map<IdFeedback, ReturnType<typeof setTimeout>>();
  private alResolver: ((resultado: ResultadoDialogo) => void) | undefined;

  private readonly _dialogo = signal<EstadoDialogo | null>(null);
  private readonly _carga = signal<EstadoCarga | null>(null);
  private readonly _toasts = signal<readonly Toast[]>([]);

  readonly dialogoActivo = this._dialogo.asReadonly();
  readonly cargaActiva = this._carga.asReadonly();
  readonly toasts = this._toasts.asReadonly();

  /** Muestra el overlay de carga bloqueante; ciérralo con `cerrar(id)` al terminar. */
  cargando(opciones: OpcionesCarga): IdFeedback {
    const id = this.nuevoId();
    this._carga.set({ id, mensaje: opciones.mensaje });
    return id;
  }

  exito(opciones: OpcionesDialogo): IdFeedback {
    return this.abrirDialogo('exito', opciones);
  }

  error(opciones: OpcionesDialogo): IdFeedback {
    return this.abrirDialogo('error', opciones);
  }

  info(opciones: OpcionesDialogo): IdFeedback {
    return this.abrirDialogo('info', opciones);
  }

  toast(opciones: OpcionesToast): IdFeedback {
    const id = this.nuevoId();
    this._toasts.update((ts) => [
      ...ts,
      { id, variante: opciones.variante, mensaje: opciones.mensaje, titulo: opciones.titulo ?? '' },
    ]);
    this.programar(id, opciones.autoCierreMs ?? AUTO_CIERRE_TOAST_MS);
    return id;
  }

  /** Sin `id` cierra el feedback bloqueante (diálogo y carga); con `id`, ese diálogo, carga o toast. */
  cerrar(id?: IdFeedback): void {
    if (id === undefined) {
      this.resolver('cerrar');
      this.cerrarCarga();
      return;
    }
    this.cancelarTemporizador(id);
    if (this._dialogo()?.id === id) {
      this.resolver('cerrar');
    } else if (this._carga()?.id === id) {
      this.cerrarCarga();
    } else {
      this._toasts.update((ts) => ts.filter((t) => t.id !== id));
    }
  }

  cerrarTodo(): void {
    this.cerrar();
    this._toasts().forEach((t) => this.cancelarTemporizador(t.id));
    this._toasts.set([]);
  }

  /** Lo llama el host del diálogo al activar una acción o cerrarlo. */
  resolver(resultado: ResultadoDialogo): void {
    const dialogo = this._dialogo();
    if (!dialogo) {
      return;
    }
    this.cancelarTemporizador(dialogo.id);
    const alResolver = this.alResolver;
    this.alResolver = undefined;
    this._dialogo.set(null);
    alResolver?.(resultado);
  }

  private abrirDialogo(variante: VarianteResultado, o: OpcionesDialogo): IdFeedback {
    // Un diálogo nuevo reemplaza al anterior sin invocar su callback.
    const previo = this._dialogo();
    if (previo) {
      this.cancelarTemporizador(previo.id);
    }
    const id = this.nuevoId();
    this.alResolver = o.alResolver;
    this._dialogo.set({
      id,
      variante,
      titulo: o.titulo,
      mensaje: o.mensaje,
      acciones: o.acciones ?? { confirmar: 'Entendido' },
      cierrePorEsc: o.cierrePorEsc ?? true,
      cierrePorFondo: o.cierrePorFondo ?? true,
    });
    if (o.autoCierreMs) {
      this.programar(id, o.autoCierreMs);
    }
    return id;
  }

  private cerrarCarga(): void {
    this._carga.set(null);
  }

  private programar(id: IdFeedback, ms: number): void {
    if (ms > 0) {
      this.temporizadores.set(id, setTimeout(() => this.cerrar(id), ms));
    }
  }

  private cancelarTemporizador(id: IdFeedback): void {
    clearTimeout(this.temporizadores.get(id));
    this.temporizadores.delete(id);
  }

  private nuevoId(): IdFeedback {
    return `fb-${++this.secuencia}`;
  }
}
