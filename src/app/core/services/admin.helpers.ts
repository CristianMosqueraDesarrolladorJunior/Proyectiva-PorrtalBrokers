import { Indicadores, Negocio } from '../models/admin.model';

/**
 * Helpers PUROS de la consola de administración: agregaciones y validaciones
 * sin dependencias de Angular, para poder probarlos de forma aislada.
 */

export const INDICADORES_VACIOS: Indicadores = {
  negocios: 0,
  expedidos: 0,
  pendientesValidacion: 0,
  pendientesCorreccion: 0,
  desistidos: 0,
  primaExpedida: 0,
};

/** Suma un negocio a unos indicadores (inmutable). */
export function sumarNegocio(ind: Indicadores, n: Negocio): Indicadores {
  const e = n.estado;
  return {
    negocios: ind.negocios + 1,
    expedidos: ind.expedidos + (e === 'Expedido' ? 1 : 0),
    pendientesValidacion: ind.pendientesValidacion + (e === 'Pendiente Validación Documental' ? 1 : 0),
    pendientesCorreccion: ind.pendientesCorreccion + (e === 'Pendiente Corrección Documental' ? 1 : 0),
    desistidos: ind.desistidos + (e === 'Desistido' ? 1 : 0),
    primaExpedida: ind.primaExpedida + (e === 'Expedido' ? n.valorPoliza : 0),
  };
}

/** Indicadores de una lista de negocios. */
export function calcularIndicadores(negocios: readonly Negocio[]): Indicadores {
  return negocios.reduce(sumarNegocio, INDICADORES_VACIOS);
}

/** Suma dos indicadores. */
export function combinar(a: Indicadores, b: Indicadores): Indicadores {
  return {
    negocios: a.negocios + b.negocios,
    expedidos: a.expedidos + b.expedidos,
    pendientesValidacion: a.pendientesValidacion + b.pendientesValidacion,
    pendientesCorreccion: a.pendientesCorreccion + b.pendientesCorreccion,
    desistidos: a.desistidos + b.desistidos,
    primaExpedida: a.primaExpedida + b.primaExpedida,
  };
}

/** Pendientes (validación + corrección). */
export function pendientes(ind: Indicadores): number {
  return ind.pendientesValidacion + ind.pendientesCorreccion;
}

/** Barra mensual del resumen. */
export interface BarraMes {
  readonly clave: string; // 2025-01
  readonly etiqueta: string; // ene 25
  readonly negocios: number;
  readonly expedidos: number;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Etiqueta corta "abr 2026" de una clave "2026-04". */
export function etiquetaMes(clave: string, anioCorto = false): string {
  const [a, m] = clave.split('-');
  const anio = anioCorto ? a.slice(2) : a;
  return `${MESES[+m - 1] ?? m} ${anio}`;
}

/**
 * Radicaciones por mes de los últimos `meses` meses, terminando en el mes más
 * reciente con datos (los datos son históricos, no "hoy").
 */
export function agruparPorMes(negocios: readonly Negocio[], meses = 12): BarraMes[] {
  const conteo = new Map<string, { negocios: number; expedidos: number }>();
  let ultimo = '';
  for (const n of negocios) {
    const clave = n.fecha.slice(0, 7);
    if (!clave) continue;
    if (clave > ultimo) ultimo = clave;
    const c = conteo.get(clave) ?? { negocios: 0, expedidos: 0 };
    c.negocios++;
    if (n.estado === 'Expedido') c.expedidos++;
    conteo.set(clave, c);
  }
  if (!ultimo) return [];
  const [anio, mes] = ultimo.split('-').map(Number);
  const barras: BarraMes[] = [];
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(anio, mes - 1 - i, 1);
    const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const c = conteo.get(clave) ?? { negocios: 0, expedidos: 0 };
    barras.push({ clave, etiqueta: etiquetaMes(clave, true), ...c });
  }
  return barras;
}

/** Formatea pesos colombianos sin decimales. */
export function cop(valor: number): string {
  return '$' + Math.round(valor).toLocaleString('es-CO');
}

/** Formatea pesos en forma compacta: $1.234 M. */
export function copCompacto(valor: number): string {
  if (valor >= 1_000_000_000) return `$${(valor / 1_000_000_000).toLocaleString('es-CO', { maximumFractionDigits: 2 })} mil M`;
  if (valor >= 1_000_000) return `$${(valor / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`;
  return cop(valor);
}

/** "2025-01-31T11:35:15" → "31 ene 2025". */
export function fechaCorta(iso: string): string {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${+d} ${MESES[+m - 1] ?? m} ${a}`;
}

/** Validaciones del formulario de comercial. Devuelve el mensaje o ''. */
export function validarDatosComercial(
  datos: { nombre: string; cedula: string; correo: string },
  cedulasOcupadas: ReadonlySet<string>,
): string {
  if (datos.nombre.trim().length < 3) return 'Escribe el nombre completo del comercial.';
  if (!/^\d{6,10}$/.test(datos.cedula)) return 'La cédula debe tener entre 6 y 10 dígitos.';
  if (cedulasOcupadas.has(datos.cedula)) return 'Esa cédula ya tiene un usuario en la consola.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(datos.correo.trim())) return 'Escribe un correo válido.';
  return '';
}

const ALFABETO_CLAVE = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

/** Clave temporal de 10 caracteres + sufijo "#" (se muestra una sola vez). */
export function generarClaveTemporal(aleatorio: (n: number) => Uint32Array = aleatorioSeguro): string {
  const valores = aleatorio(10);
  let clave = '';
  for (const v of valores) {
    clave += ALFABETO_CLAVE[v % ALFABETO_CLAVE.length];
  }
  return clave + '#';
}

function aleatorioSeguro(n: number): Uint32Array {
  const arr = new Uint32Array(n);
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < n; i++) arr[i] = Math.floor(Math.random() * 2 ** 32);
  }
  return arr;
}

/**
 * MOCK: estado de Cuenta y documentos aportados de un broker del Warehouse.
 * Determinístico por identificación (≈1 de cada 4 es prospecto) para que la
 * consola muestre ambos estados hasta tener `/api/v1/admin/brokers`.
 */
export function cuentaMock(id: string): { estadoCuenta: 'PROSPECTO' | 'REGISTRADO'; documentosAportados: number } {
  let h = 0;
  for (const c of id) {
    h = (h * 31 + c.charCodeAt(0)) >>> 0;
  }
  const prospecto = h % 4 === 0;
  return { estadoCuenta: prospecto ? 'PROSPECTO' : 'REGISTRADO', documentosAportados: prospecto ? (h >> 3) % 4 : 4 };
}

/** Normaliza texto para búsquedas: minúsculas, sin tildes. */
export function normalizarBusqueda(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/** Pagina una lista en memoria (página 1-indexada). */
export function paginar<T>(items: readonly T[], pagina: number, tamano: number) {
  const total = items.length;
  const paginas = Math.max(1, Math.ceil(total / tamano));
  const p = Math.min(Math.max(1, pagina), paginas);
  return { items: items.slice((p - 1) * tamano, p * tamano), total, pagina: p, tamano };
}
