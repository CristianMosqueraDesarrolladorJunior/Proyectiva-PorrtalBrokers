/** Conjuntos cerrados del contrato de `GET /api/v1/calendario/eventos` (espejo del backend). */
export const TIPOS_EVENTO = [
  'INICIO_CONTRATO',
  'VENCIMIENTO_POLIZA',
  'COTIZACION_REALIZADA',
  'RENOVACION_VENCIMIENTO',
] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];

export const CLASIFICACIONES_TEMPORALES = ['PASADO', 'HOY', 'FUTURO'] as const;
export type ClasificacionTemporal = (typeof CLASIFICACIONES_TEMPORALES)[number];

/** Referencia a la entidad de origen: tipo e identificador de dominio (sin PII). */
export interface ReferenciaOrigen {
  readonly tipo: TipoEvento;
  readonly idDominio: string;
}

/** Evento tal como llega del API. */
export interface EventoTemporalDto {
  readonly fecha: string; // yyyy-MM-dd
  readonly hora: string; // HH:mm[:ss]
  readonly todoElDia: boolean;
  readonly tipoEvento: TipoEvento;
  readonly descripcion: string;
  readonly referenciaOrigen: ReferenciaOrigen;
  readonly clasificacionTemporal: ClasificacionTemporal;
}

export type EventoTemporal = EventoTemporalDto;

const esTexto = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

/**
 * Valida que un DTO cumpla el contrato (presencia, tipos y pertenencia a los conjuntos cerrados).
 * @throws Error si el DTO no es conforme; el mensaje es genérico (sin datos del payload).
 */
export function validarEvento(dto: unknown): EventoTemporal {
  const e = dto as Partial<Record<keyof EventoTemporalDto, unknown>> | null;
  const ref = e?.referenciaOrigen as Partial<ReferenciaOrigen> | null | undefined;
  const conforme =
    !!e &&
    esTexto(e.fecha) &&
    /^\d{4}-\d{2}-\d{2}$/.test(e.fecha) &&
    esTexto(e.hora) &&
    typeof e.todoElDia === 'boolean' &&
    (TIPOS_EVENTO as readonly unknown[]).includes(e.tipoEvento) &&
    esTexto(e.descripcion) &&
    !!ref &&
    (TIPOS_EVENTO as readonly unknown[]).includes(ref.tipo) &&
    esTexto(ref.idDominio) &&
    (CLASIFICACIONES_TEMPORALES as readonly unknown[]).includes(e.clasificacionTemporal);
  if (!conforme) {
    throw new Error('Respuesta de calendario no conforme');
  }
  return dto as EventoTemporal;
}
