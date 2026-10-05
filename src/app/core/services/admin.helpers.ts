/**
 * Helpers de PRESENTACIÓN de la consola de administración: formateo de moneda y
 * fechas. Son funciones puras sin dependencias de Angular. La lógica de negocio
 * (indicadores, agregaciones, filtros, paginación, validaciones) la resuelve el
 * backend (`/api/v1/admin/*`); el frontend solo presenta lo que recibe.
 */

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Etiqueta corta "abr 2026" de una clave "2026-04". */
export function etiquetaMes(clave: string, anioCorto = false): string {
  const [a, m] = clave.split('-');
  const anio = anioCorto ? a.slice(2) : a;
  return `${MESES[+m - 1] ?? m} ${anio}`;
}

/** Formatea pesos colombianos sin decimales. */
export function cop(valor: number): string {
  return '$' + Math.round(valor).toLocaleString('es-CO');
}

/** Formatea pesos en forma compacta: $1.234 M. */
export function copCompacto(valor: number): string {
  if (valor >= 1_000_000_000) {
    return `$${(valor / 1_000_000_000).toLocaleString('es-CO', { maximumFractionDigits: 2 })} mil M`;
  }
  if (valor >= 1_000_000) {
    return `$${(valor / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`;
  }
  return cop(valor);
}

/** "2025-01-31" → "31 ene 2025". */
export function fechaCorta(iso: string): string {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${+d} ${MESES[+m - 1] ?? m} ${a}`;
}
