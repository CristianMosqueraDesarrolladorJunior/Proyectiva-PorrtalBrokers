/** Clasificación semántica del feedback. */
export type VarianteEstado = 'carga' | 'exito' | 'error' | 'info';

/** Variantes que admiten diálogo o toast (la carga usa el overlay con la escalerita). */
export type VarianteResultado = Exclude<VarianteEstado, 'carga'>;

/** Variante del overlay de carga. */
export type VarianteCarga = 'inline' | 'pantalla';

/** Identificador opaco de un feedback para poder cerrarlo. */
export type IdFeedback = string;

/** Tipo de acción dentro del diálogo. */
export type TipoAccion = 'confirmar' | 'cancelar' | 'reintentar';

/** Cómo terminó un diálogo: una acción o el cierre (Esc, fondo, auto-cierre, `cerrar()`). */
export type ResultadoDialogo = TipoAccion | 'cerrar';

/** Botones a mostrar en el diálogo (allowlist); el texto es la etiqueta visible. */
export interface ConfiguracionAcciones {
  readonly confirmar?: string;
  readonly cancelar?: string;
  readonly reintentar?: string;
}

/** Opciones para mostrar un diálogo de estado (éxito, error o info). */
export interface OpcionesDialogo {
  readonly titulo: string;
  readonly mensaje: string;
  /** Default: solo «Entendido» (confirmar). */
  readonly acciones?: ConfiguracionAcciones;
  readonly cierrePorEsc?: boolean;
  readonly cierrePorFondo?: boolean;
  /** Auto-cierre en milisegundos (> 0). Si se omite, no hay auto-cierre. */
  readonly autoCierreMs?: number;
  /** Se invoca una vez cuando el diálogo termina. */
  readonly alResolver?: (resultado: ResultadoDialogo) => void;
}

/** Opciones del overlay de carga bloqueante (pantalla completa). */
export interface OpcionesCarga {
  readonly mensaje: string;
}

/** Opciones para encolar un toast. */
export interface OpcionesToast {
  readonly variante: VarianteResultado;
  readonly mensaje: string;
  /** Título corto opcional en negrita. */
  readonly titulo?: string;
  /** Auto-cierre en milisegundos (> 0). Default: 5000. */
  readonly autoCierreMs?: number;
}

/** Estado del diálogo activo. */
export interface EstadoDialogo {
  readonly id: IdFeedback;
  readonly variante: VarianteResultado;
  readonly titulo: string;
  readonly mensaje: string;
  readonly acciones: ConfiguracionAcciones;
  readonly cierrePorEsc: boolean;
  readonly cierrePorFondo: boolean;
}

/** Estado de la carga activa. */
export interface EstadoCarga {
  readonly id: IdFeedback;
  readonly mensaje: string;
}

/** Toast activo en la pila del host. */
export interface Toast {
  readonly id: IdFeedback;
  readonly variante: VarianteResultado;
  readonly mensaje: string;
  readonly titulo: string;
}

/** Icono de Material Symbols por variante (único mapa para diálogo y toast). */
export const ICONO_VARIANTE: Readonly<Record<VarianteResultado, string>> = {
  exito: 'check_circle',
  error: 'error',
  info: 'info',
};
