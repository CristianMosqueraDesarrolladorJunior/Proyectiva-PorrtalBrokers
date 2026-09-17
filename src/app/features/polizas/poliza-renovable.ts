/**
 * Lógica pura de la Consulta de Pólizas (Req 16).
 *
 * Determina, a partir del estado de una Poliza, si desde ella puede iniciarse el
 * flujo de Renovacion. Según el Req 16.4, solo las pólizas "Próxima a renovar" o
 * "A punto de vencer" habilitan el inicio de la Renovacion; una póliza "Renovada"
 * (u otro estado) no lo habilita.
 *
 * La función es pura, total y determinística, de modo que la presentación decide
 * la habilitación del inicio de la renovación sin lógica de negocio autoritativa.
 *
 * _Requirements: 16.4_
 */
import { EstadoPoliza } from '../../core/models/poliza.model';

/**
 * Conjunto de estados de Poliza desde los que se puede iniciar la Renovacion
 * (Req 16.4). Fuente única del criterio de habilitación.
 */
const ESTADOS_RENOVABLES: readonly EstadoPoliza[] = ['Próxima a renovar', 'A punto de vencer'];

/**
 * Indica si una Poliza en el estado dado permite iniciar el flujo de Renovacion.
 *
 * @param estado Estado de la Poliza (Req 16.3).
 * @returns `true` si el estado es "Próxima a renovar" o "A punto de vencer"
 *          (Req 16.4); `false` en cualquier otro caso (incluye "Renovada").
 */
export function esPolizaRenovable(estado: EstadoPoliza): boolean {
  return ESTADOS_RENOVABLES.includes(estado);
}
