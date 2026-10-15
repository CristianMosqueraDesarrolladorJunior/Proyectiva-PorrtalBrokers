// Funciones puras de presentación del calendario (sin DOM ni estado): filtrado, agrupación, view-model,
// accesibilidad y mapeo de errores. Reutilizadas por el componente compartido y por la Seccion_Calendario.

import type { ClasificacionTemporal, ReferenciaOrigen, TipoEvento } from '../../../core/models/evento-temporal.model';

/** Forma mínima de un evento para presentarlo en el calendario. */
export interface EventoPresentable {
  readonly fecha: string;
  readonly hora?: string;
  readonly todoElDia?: boolean;
  readonly tipoEvento?: TipoEvento;
  readonly clasificacionTemporal?: ClasificacionTemporal;
  readonly referenciaOrigen?: ReferenciaOrigen;
}

export type ClaveGrupo = ClasificacionTemporal | 'SIN_CLASIFICAR';

export interface GrupoEventos<T extends EventoPresentable> {
  readonly clave: ClaveGrupo;
  readonly titulo: string;
  readonly eventos: readonly T[];
}

/** Indicador no cromático (glifo + texto) por clasificación temporal. */
export const INDICADORES: Readonly<Record<ClasificacionTemporal, { glifo: string; texto: string; clase: string }>> = {
  PASADO: { glifo: '✓', texto: 'Anterior', clase: 'cal-evento--pasado' },
  HOY: { glifo: '●', texto: 'Hoy', clase: 'cal-evento--hoy' },
  FUTURO: { glifo: '→', texto: 'Próximo', clase: 'cal-evento--futuro' },
};

const TITULOS_GRUPO: Readonly<Record<ClasificacionTemporal, string>> = {
  PASADO: 'Anteriores',
  HOY: 'Hoy',
  FUTURO: 'Próximos',
};
const ORDEN_GRUPOS: readonly ClasificacionTemporal[] = ['PASADO', 'HOY', 'FUTURO'];

/** Fechas distintas (yyyy-MM-dd) con al menos un evento. */
export function diasConEventos(eventos: readonly EventoPresentable[]): ReadonlySet<string> {
  return new Set(eventos.map((e) => e.fecha));
}

/** Eventos de un día concreto, en el orden recibido. */
export function eventosDelDia<T extends EventoPresentable>(eventos: readonly T[], dia: string): readonly T[] {
  return eventos.filter((e) => e.fecha === dia);
}

/** HH:mm ascendente con `todoElDia` al inicio (00:00). */
function minutos(e: EventoPresentable): number {
  if (e.todoElDia || !e.hora) return 0;
  const [h, m] = e.hora.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Agrupa los eventos de un día en Anteriores / Hoy / Próximos (en ese orden, sin grupos vacíos), cada grupo
 * ordenado por hora. Los eventos sin clasificación van en un grupo sin título al final.
 */
export function agruparDia<T extends EventoPresentable>(eventos: readonly T[]): readonly GrupoEventos<T>[] {
  const ordenar = (lista: readonly T[]) => [...lista].sort((a, b) => minutos(a) - minutos(b));
  const grupos: GrupoEventos<T>[] = ORDEN_GRUPOS.map((clave) => ({
    clave,
    titulo: TITULOS_GRUPO[clave],
    eventos: ordenar(eventos.filter((e) => e.clasificacionTemporal === clave)),
  }));
  grupos.push({ clave: 'SIN_CLASIFICAR', titulo: '', eventos: ordenar(eventos.filter((e) => !e.clasificacionTemporal)) });
  return grupos.filter((g) => g.eventos.length > 0);
}

/** Solo las renovaciones por vencer se gestionan desde el calendario. */
export function esGestionable(e: EventoPresentable): boolean {
  return e.tipoEvento === 'RENOVACION_VENCIMIENTO';
}

/**
 * Ruta a Seguimiento construida solo desde la `Referencia_Origen` (tipo + idDominio, sin PII).
 * Una referencia nula, vacía o de otro tipo no produce ruta.
 */
export function rutaSeguimiento(e: EventoPresentable): { ruta: string[]; queryParams: Record<string, string> } | null {
  const ref = e.referenciaOrigen;
  const id = ref?.idDominio?.trim();
  if (!ref || ref.tipo !== 'RENOVACION_VENCIMIENTO' || !id || !/^[\w.-]{1,64}$/.test(id)) return null;
  return { ruta: ['/app/renovaciones/induccion'], queryParams: { poliza: id } };
}

/** Indicador de la clasificación recibida (el estilo no recalcula la fecha); sin clasificación, texto neutro. */
export function indicadorDe(e: EventoPresentable): { glifo: string; texto: string; clase: string } {
  return e.clasificacionTemporal ? INDICADORES[e.clasificacionTemporal] : { glifo: '', texto: 'Evento', clase: '' };
}

/** Etiqueta accesible de un día (siempre no vacía). */
export function etiquetaDia(dia: number, cantidad: number): string {
  return `Día ${dia}, ${cantidad > 0 ? (cantidad === 1 ? '1 evento' : `${cantidad} eventos`) : 'sin eventos'}`;
}

/** Texto accesible del evento que incluye la clasificación en palabras (con texto de reemplazo). */
export function textoAccesibleEvento(e: EventoPresentable & { titulo?: string; descripcion?: string }): string {
  const nombre = e.titulo ?? e.descripcion ?? 'Evento';
  return `${indicadorDe(e).texto}: ${nombre}`;
}

const MENSAJE_GENERICO = 'No pudimos cargar tu calendario. Intenta de nuevo.';
const MENSAJES_ERROR: Readonly<Record<number, string>> = {
  401: 'Tu sesión expiró. Inicia sesión de nuevo.',
  403: 'No tienes acceso al calendario.',
};

/** Mensaje genérico (allowlist) para un error: nunca expone trazas, códigos internos ni PII. */
export function mensajeDeError(err: unknown): string {
  const status = (err as { status?: unknown } | null)?.status;
  return typeof status === 'number' && MENSAJES_ERROR[status] ? MENSAJES_ERROR[status] : MENSAJE_GENERICO;
}
