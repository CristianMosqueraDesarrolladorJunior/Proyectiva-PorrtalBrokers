/**
 * Lógica pura de escalonamiento del monto de una Cobertura (Req 7.6, 14.4).
 *
 * El monto asegurado se ajusta en pasos de $500.000, con un mínimo de $0 y sin
 * permitir valores negativos. Estas funciones son puras (sin efectos ni estado)
 * para poder reutilizarse tanto en la sección Coberturas (Req 14) como en el
 * Cotizador (Req 7) y verificarse con la Property 6 (fast-check).
 *
 * Property 6 (design.md): para toda secuencia de incrementos y decrementos
 * aplicados desde cualquier monto inicial no negativo, el monto resultante es
 * siempre `>= 0`, múltiplo de $500.000, e igual a
 * `max(0, inicial + PASO_MONTO_COBERTURA * (incrementos - decrementos))`.
 */

/** Paso de ajuste del monto asegurado de una Cobertura: $500.000 (Req 7.6, 14.4). */
export const PASO_MONTO_COBERTURA = 500_000;

/** Monto mínimo permitido para una Cobertura: $0 (Req 7.6, 14.4). */
export const MONTO_MINIMO_COBERTURA = 0;

/**
 * Normaliza un monto al escalón válido más cercano hacia abajo, garantizando
 * que sea no negativo y múltiplo de {@link PASO_MONTO_COBERTURA}.
 * @param monto monto a normalizar.
 * @returns monto no negativo, múltiplo de $500.000.
 */
export function normalizarMonto(monto: number): number {
  if (!Number.isFinite(monto) || monto <= MONTO_MINIMO_COBERTURA) {
    return MONTO_MINIMO_COBERTURA;
  }
  return Math.floor(monto / PASO_MONTO_COBERTURA) * PASO_MONTO_COBERTURA;
}

/**
 * Incrementa el monto en un paso de $500.000 (Req 14.4).
 * @param monto monto actual.
 * @returns monto normalizado + un paso.
 */
export function incrementarMonto(monto: number): number {
  return normalizarMonto(monto) + PASO_MONTO_COBERTURA;
}

/**
 * Decrementa el monto en un paso de $500.000 sin permitir valores negativos
 * (mínimo $0) (Req 14.4).
 * @param monto monto actual.
 * @returns monto normalizado - un paso, acotado a $0.
 */
export function decrementarMonto(monto: number): number {
  return Math.max(MONTO_MINIMO_COBERTURA, normalizarMonto(monto) - PASO_MONTO_COBERTURA);
}
