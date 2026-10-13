/**
 * Lógica pura de escalonamiento del monto de una Cobertura (Req 7.6, 14.4).
 *
 * El monto asegurado se ajusta en pasos de `paso` (parámetro `PASO_MONTO_COBERTURA` de BD), con un
 * mínimo de $0 y sin permitir valores negativos. Funciones puras para reutilizarse en Coberturas y
 * en el Cotizador (Property 6: el resultado es siempre `>= 0` y múltiplo del paso).
 */

/** Monto mínimo permitido para una Cobertura: $0 (Req 7.6, 14.4). */
export const MONTO_MINIMO_COBERTURA = 0;

/** Normaliza un monto al escalón válido más cercano hacia abajo (no negativo, múltiplo de `paso`). */
export function normalizarMonto(monto: number, paso: number): number {
  if (!Number.isFinite(monto) || monto <= MONTO_MINIMO_COBERTURA || !(paso > 0)) {
    return Math.max(MONTO_MINIMO_COBERTURA, Number.isFinite(monto) ? monto : 0);
  }
  return Math.floor(monto / paso) * paso;
}

/** Incrementa el monto en un paso (Req 14.4). */
export function incrementarMonto(monto: number, paso: number): number {
  return normalizarMonto(monto, paso) + paso;
}

/** Decrementa el monto en un paso sin bajar de $0 (Req 14.4). */
export function decrementarMonto(monto: number, paso: number): number {
  return Math.max(MONTO_MINIMO_COBERTURA, normalizarMonto(monto, paso) - paso);
}
