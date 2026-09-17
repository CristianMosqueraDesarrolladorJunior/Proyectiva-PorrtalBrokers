/**
 * Lógica PURA de cálculo de KPIs del Estado de referidos (Req 15.4).
 *
 * Ubicación: junto al feature `referidos`. Deriva los KPIs (total, aceptadas,
 * en proceso, rechazadas) a partir de la lista de referidos, clasificando por su
 * estado de forma insensible a mayúsculas/minúsculas y a espacios. Es lógica de
 * presentación, sin dependencias de Angular.
 *
 * Función pura, total y determinista.
 *
 * _Requirements: 15.4_
 */

import type { Referido } from '../../core/services/referidos.service';

/** KPIs del Estado de referidos mostrados sobre la tabla (Req 15.4). */
export interface KpisReferidos {
  /** Número total de referidos. */
  readonly total: number;
  /** Referidos en estado "aceptada". */
  readonly aceptadas: number;
  /** Referidos en estado "en proceso". */
  readonly enProceso: number;
  /** Referidos en estado "rechazada". */
  readonly rechazadas: number;
}

/** Normaliza el estado para clasificación (minúsculas y sin espacios en extremos). */
function normalizarEstado(estado: string): string {
  return estado.trim().toLowerCase();
}

/**
 * Calcula los KPIs de referidos a partir de la lista (Req 15.4).
 *
 * El total es la longitud de la lista; las demás cuentas clasifican cada referido
 * por su estado normalizado ("aceptada", "en proceso" o "en_proceso", "rechazada").
 * Los estados no reconocidos solo cuentan para el total. Función pura y total.
 *
 * @param referidos Lista de referidos a clasificar.
 * @returns KPIs agregados (total, aceptadas, en proceso, rechazadas).
 */
export function calcularKpisReferidos(referidos: readonly Referido[]): KpisReferidos {
  let aceptadas = 0;
  let enProceso = 0;
  let rechazadas = 0;

  for (const referido of referidos) {
    const estado = normalizarEstado(referido.estado);
    if (estado === 'aceptada') {
      aceptadas += 1;
    } else if (estado === 'en proceso' || estado === 'en_proceso') {
      enProceso += 1;
    } else if (estado === 'rechazada') {
      rechazadas += 1;
    }
  }

  return {
    total: referidos.length,
    aceptadas,
    enProceso,
    rechazadas,
  };
}
