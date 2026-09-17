/**
 * Mapeo TOTAL de estado de dominio a variante de insignia de estado.
 *
 * Cubre todos los estados del dominio del Portal —Solicitud (Req 5.4, 6.3),
 * Poliza (Req 16.3) y evento de calendario (Req 33.2)— y los mapea a exactamente
 * una `VarianteBadge` cuyo color corresponde al Design_Token respectivo
 * (`--color-success`, `--color-info`, `--color-accent`/warning, `--color-danger`).
 *
 * La función `estadoABadge` es pura, total y determinística: para todo estado del
 * dominio devuelve exactamente una variante, y para cualquier string desconocido
 * aplica un default seguro (`badge-info`). Alinea con la Property 14 del diseño.
 *
 * _Requirements: 5.4, 6.3, 16.3, 33.2_
 */
import { Pipe, PipeTransform } from '@angular/core';
import { EstadoSolicitud } from '../../core/models/solicitud.model';
import { EstadoPoliza } from '../../core/models/poliza.model';

/**
 * Variante de insignia de estado alineada con los Design_Token de color.
 * Cada variante corresponde a una clase CSS tokenizada del `BadgeEstadoComponent`
 * (badge-success/info/warning/danger, Req 35.2).
 */
export type VarianteBadge =
  | 'badge-success'
  | 'badge-info'
  | 'badge-warning'
  | 'badge-danger';

/**
 * Estado de un evento de calendario resaltado en la Seccion_Calendario (Req 33.2):
 * un evento puede estar "próximo" a vencer o ser "urgente".
 */
export type EstadoEventoCalendario = 'proximo' | 'urgente';

/**
 * Cualquier estado de dominio mapeable a una insignia. Se acepta `string` porque
 * `EstadoPoliza` admite valores adicionales del backend y los estados de calendario
 * pueden llegar como texto; el mapeo garantiza totalidad con un default seguro.
 */
export type EstadoDominio =
  | EstadoSolicitud
  | EstadoPoliza
  | EstadoEventoCalendario
  | string;

/** Variante por defecto para estados desconocidos (garantiza totalidad). */
const VARIANTE_POR_DEFECTO: VarianteBadge = 'badge-info';

/**
 * Tabla de mapeo estado → variante. Fuente única del criterio de color.
 * Las claves cubren los estados del prototipo/dominio; strings fuera de la tabla
 * caen en `VARIANTE_POR_DEFECTO`.
 */
const MAPA_ESTADO_BADGE: Readonly<Record<string, VarianteBadge>> = {
  // --- Solicitud (Req 5.4, 6.3) ---
  aprobada: 'badge-success',
  radicada: 'badge-info',
  en_revision: 'badge-info',
  observada: 'badge-warning',
  bloqueada: 'badge-danger',

  // --- Poliza (Req 16.3) ---
  Renovada: 'badge-success',
  'Próxima a renovar': 'badge-info',
  'A punto de vencer': 'badge-warning',

  // --- Evento de calendario (Req 33.2) ---
  proximo: 'badge-info',
  urgente: 'badge-danger',

  // --- Referido (Req 15.4) ---
  aceptada: 'badge-success',
  'en proceso': 'badge-info',
  en_proceso: 'badge-info',
  rechazada: 'badge-danger',
};

/**
 * Mapea un estado de dominio a su `VarianteBadge` de forma total y determinística.
 *
 * @param estado Estado de Solicitud, Poliza o evento de calendario (o string libre).
 * @returns La variante de insignia correspondiente; `badge-info` si el estado es
 *          desconocido (default seguro que garantiza totalidad).
 */
export function estadoABadge(estado: EstadoDominio): VarianteBadge {
  return MAPA_ESTADO_BADGE[estado] ?? VARIANTE_POR_DEFECTO;
}

/**
 * Pipe standalone que expone `estadoABadge` para plantillas.
 * Uso: `<span [class]="estado | estadoBadge">`.
 */
@Pipe({
  name: 'estadoBadge',
  standalone: true,
})
export class EstadoBadgePipe implements PipeTransform {
  /**
   * Transforma un estado de dominio en su variante de insignia.
   * @param estado Estado de dominio a mapear.
   * @returns La `VarianteBadge` correspondiente.
   */
  transform(estado: EstadoDominio): VarianteBadge {
    return estadoABadge(estado);
  }
}
