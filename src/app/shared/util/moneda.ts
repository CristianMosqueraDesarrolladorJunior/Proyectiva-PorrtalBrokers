/**
 * Formateo de moneda compartido (fuente única): pesos colombianos sin decimales.
 * Usar en toda la plataforma en lugar de `Intl.NumberFormat` local.
 */
const FORMATO_COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** Formatea un importe como pesos colombianos sin decimales (p. ej. "$ 1.500.000"). */
export function formatearCop(valor: number): string {
  return FORMATO_COP.format(valor);
}
