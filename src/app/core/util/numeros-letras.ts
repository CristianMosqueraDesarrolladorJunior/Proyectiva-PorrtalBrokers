/**
 * Números escritos como los escribe una persona (porte fiel de `cuentas/numeros`).
 *
 * La cuenta de cobro lleva el valor en cifra y en letra; aquí la letra se deriva de la cifra,
 * así que nunca pueden discrepar. Funciones puras y totales.
 */

const UNIDADES = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
  'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte'];
const DECENAS = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos',
  'setecientos', 'ochocientos', 'novecientos'];
const VEINTI_TILDADOS: Readonly<Record<string, string>> = { uno: 'uno', dos: 'dós', tres: 'trés' };

function hasta99(n: number): string {
  if (n <= 20) return UNIDADES[n];
  if (n < 30) {
    const resto = UNIDADES[n - 20];
    return 'veinti' + (VEINTI_TILDADOS[resto] ?? resto);
  }
  const decena = Math.floor(n / 10);
  const unidad = n % 10;
  return unidad === 0 ? DECENAS[decena] : `${DECENAS[decena]} y ${UNIDADES[unidad]}`;
}

function hasta999(n: number): string {
  if (n === 100) return 'cien';
  const centena = Math.floor(n / 100);
  const resto = n % 100;
  const partes = centena ? [CENTENAS[centena]] : [];
  if (resto) partes.push(hasta99(resto));
  return partes.join(' ');
}

/** «veintiuno mil» → «veintiún mil», «uno millón» → «un millón». */
function apocopar(texto: string): string {
  if (texto.endsWith('veintiuno')) return texto.slice(0, -9) + 'veintiún';
  if (texto === 'uno') return 'un';
  if (texto.endsWith(' uno')) return texto.slice(0, -4) + ' un';
  return texto;
}

/** Un entero en letras, en minúscula: 324769 → «trescientos veinticuatro mil setecientos sesenta y nueve». */
export function enLetras(valor: number): string {
  const n = Math.round(valor);
  if (n === 0) return 'cero';
  if (n < 0) return 'menos ' + enLetras(-n);
  const partes: string[] = [];
  const millones = Math.floor(n / 1_000_000);
  const resto = n % 1_000_000;
  if (millones) {
    const cabeza = millones === 1 ? 'un' : apocopar(enLetras(millones));
    partes.push(`${cabeza} ${millones === 1 ? 'millón' : 'millones'}`);
  }
  const miles = Math.floor(resto / 1000);
  const unidades = resto % 1000;
  if (miles) partes.push(miles === 1 ? 'mil' : `${apocopar(hasta999(miles))} mil`);
  if (unidades) partes.push(hasta999(unidades));
  return partes.filter(Boolean).join(' ');
}

/** Como lo lleva la cuenta de cobro: «Trescientos Veinticuatro Mil … Pesos m/cte.». */
export function enLetrasPesos(valor: number): string {
  return (
    enLetras(valor)
      .split(' ')
      .map((p) => (p === 'y' ? p : p.charAt(0).toUpperCase() + p.slice(1)))
      .join(' ') + ' Pesos m/cte.'
  );
}

/** Separador de miles colombiano: 324769 → «324.769». */
export function conPuntos(valor: number): string {
  return String(Math.trunc(Math.abs(valor))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Pesos con signo: «$ 324.769». */
export function pesos(valor: number): string {
  if (!Number.isFinite(valor)) return '$ 0';
  const entero = Math.round(valor);
  return `${entero < 0 ? '-' : ''}$ ${conPuntos(entero)}`;
}

/**
 * Lo que escribe una persona → entero. Acepta «$ 1.234.567», «1,234,567», «1234567,50».
 * `null` si no hay dígitos.
 */
export function aEntero(texto: string | number | null | undefined): number | null {
  if (texto === null || texto === undefined) return null;
  if (typeof texto === 'number') return Number.isFinite(texto) ? Math.round(texto) : null;
  let t = String(texto).trim().replace(/\$/g, '').replace(/ /g, '');
  if (!t) return null;
  let decimales = 0;
  if (t.length > 3 && '.,'.includes(t.charAt(t.length - 3)) && /^\d{2}$/.test(t.slice(-2))) {
    decimales = Number(t.slice(-2)) / 100;
    t = t.slice(0, -3);
  }
  const digitos = t.replace(/\D/g, '');
  return digitos ? Math.round(Number(digitos) + decimales) : null;
}
