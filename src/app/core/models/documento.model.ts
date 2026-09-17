/**
 * Modelos de documentos cargados en el Portal (Req 13).
 * Tipos MIME permitidos y metadatos de un documento subido por el Broker.
 */

/** Tipos MIME aceptados para los documentos del Portal (PDF/JPG/PNG) (Req 3.17, 13.1). */
export type TipoMimePermitido = 'application/pdf' | 'image/jpeg' | 'image/png';

/**
 * Documento genérico cargado por el Broker (Req 13).
 * El límite general de tamaño es 10 MB; la Autorización de Pago aplica 5 MB (Req 13.2, 3.18).
 */
export interface DocumentoCargado {
  readonly nombre: string;
  readonly tipoMime: TipoMimePermitido;
  readonly tamanoBytes: number;   // límite general 10MB; autorización de pago 5MB
  readonly fechaEmision?: string; // para vigencia (tradición ≤90d, existencia ≤30d)
}
