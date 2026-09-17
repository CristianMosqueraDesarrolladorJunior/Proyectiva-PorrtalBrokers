/**
 * Modelos del Chat_Asistente Proyectiva (Req 38).
 * El contenido del bot se escapa/sanitiza antes de renderizar y la PII se redacta
 * antes de enviar la consulta al Servicio_Asistente (Req 38.15, 38.16).
 */

/** Autor de un Mensaje_Chat del historial (Req 38.5, 38.6). */
export type AutorMensaje = 'broker' | 'asistente';

/** Mensaje del historial del Chat_Asistente de la sesión actual (Req 38.5–38.7). */
export interface MensajeChat {
  readonly autor: AutorMensaje;
  readonly contenido: string;
}

/** Sugerencia rápida (suggestion-pill) ofrecida por el Chat_Asistente (Req 38.4, 38.8). */
export interface SugerenciaRapida {
  readonly texto: string;
}

/**
 * Consulta enviada al Servicio_Asistente (Req 38.5, 38.15).
 * El contenido se redacta para excluir PII y secretos antes de invocar el Asistente_IA.
 */
export interface ConsultaAsistente {
  readonly consulta: string;
}
