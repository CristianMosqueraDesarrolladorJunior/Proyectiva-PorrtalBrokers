/** Perfil del Tour (coincide con los roles de sesión del Portal). */
export type PerfilTour = 'PROSPECTO' | 'BROKER' | 'ADMINISTRADOR' | 'COMERCIAL';

/** Un paso del recorrido: la vista que se muestra (`ruta`; sin ella, el paso explica la vista actual), su título y qué hacer allí. */
export interface PasoTour {
  readonly titulo: string;
  readonly texto: string;
  readonly ruta?: string;
  /** Paso que abre una vista que depende de los datos del usuario (p. ej. su primera renovación). */
  readonly abrir?: 'primeraRenovacion';
  readonly icono?: string;
}

/** Guion_Tour de un perfil. Invariante: al menos un paso. */
export interface GuionTour {
  readonly perfil: PerfilTour;
  readonly pasos: readonly PasoTour[];
}

/** Estado_Primer_Ingreso que expone el backend (`GET/PUT /onboarding/estado`). */
export interface EstadoOnboarding {
  readonly perfil: PerfilTour;
  readonly tourVisto: boolean;
}

/** Requisito listado en el Paso «Cómo funciona» del registro. */
export interface RequisitoRegistro {
  readonly id: string;
  readonly etiqueta: string;
  readonly descripcion: string;
  readonly icono: string;
}
