import fc from 'fast-check';

import { aEntero, conPuntos, enLetrasPesos, pesos } from './numeros-letras';
import { revisarIncremento, topeDeCanon } from './reglas-renovacion';

/** Mismos valores de `parametro_negocio` (V54). */
const IPC = 5.1;
const ANIO_IPC = 2026;

/**
 * Valores de referencia calculados con el script original (`cuentas/numeros` y `cuentas/reglas`)
 * antes de retirarlo: el porte debe dar exactamente lo mismo.
 */
const LETRAS: Record<string, string> = {"0": "Cero Pesos m/cte.", "1": "Uno Pesos m/cte.", "15": "Quince Pesos m/cte.", "16": "Dieciséis Pesos m/cte.", "21": "Veintiuno Pesos m/cte.", "22": "Veintidós Pesos m/cte.", "23": "Veintitrés Pesos m/cte.", "29": "Veintinueve Pesos m/cte.", "100": "Cien Pesos m/cte.", "101": "Ciento Uno Pesos m/cte.", "121": "Ciento Veintiuno Pesos m/cte.", "1000": "Mil Pesos m/cte.", "1001": "Mil Uno Pesos m/cte.", "21000": "Veintiún Mil Pesos m/cte.", "31000": "Treinta y Un Mil Pesos m/cte.", "100000": "Cien Mil Pesos m/cte.", "121000": "Ciento Veintiún Mil Pesos m/cte.", "324769": "Trescientos Veinticuatro Mil Setecientos Sesenta y Nueve Pesos m/cte.", "1000000": "Un Millón Pesos m/cte.", "1000001": "Un Millón Uno Pesos m/cte.", "2021000": "Dos Millones Veintiún Mil Pesos m/cte.", "21000000": "Veintiún Millones Pesos m/cte.", "123456789": "Ciento Veintitrés Millones Cuatrocientos Cincuenta y Seis Mil Setecientos Ochenta y Nueve Pesos m/cte.", "500000000": "Quinientos Millones Pesos m/cte."};
const INCREMENTOS: [[number, number, 'vivienda' | 'comercio'], { error: string; aviso: string }][] = [[[2000000, 2102000, "vivienda"], {"error": "", "aviso": ""}], [[2000000, 2102001, "vivienda"], {"error": "", "aviso": "ESTE INCREMENTO NECESITA UN «OTRO SÍ». Estás subiendo el canon un 5.1 % —de 2.000.000 a 2.102.001— y en vivienda el tope sin acuerdo es el 5.10 % del IPC de 2025, o sea 2.102.000. Para subir más hace falta un otro sí firmado por el propietario y el inquilino; sin él, Bolívar devuelve la renovación."}], [[2000000, 1999999, "vivienda"], {"error": "El canon no puede quedar por debajo del que tiene la póliza: venía en 2.000.000 y escribiste 1.999.999.", "aviso": ""}], [[2000000, 3000000, "comercio"], {"error": "", "aviso": ""}], [[2000000, 0, "vivienda"], {"error": "Escribe el canon con el que queda la póliza.", "aviso": ""}]];
const ENTEROS: [string, number | null][] = [["$ 1.234.567", 1234567], ["1,234,567", 1234567], ["1234567,50", 1234568], ["abc", null], ["", null], [" 12 ", 12]];

describe('numeros-letras (porte de cuentas/numeros)', () => {
  it('escribe en letras exactamente como el original', () => {
    for (const [n, esperado] of Object.entries(LETRAS)) {
      expect(enLetrasPesos(Number(n))).toBe(esperado);
    }
  });

  it('interpreta lo que escribe una persona como el original', () => {
    for (const [texto, esperado] of ENTEROS) {
      expect(aEntero(texto)).toBe(esperado);
    }
  });

  it('cifra con puntos y pesos con signo', () => {
    expect(conPuntos(324769)).toBe('324.769');
    expect(pesos(-1500)).toBe('-$ 1.500');
    expect(pesos(Number.NaN)).toBe('$ 0');
  });

  it('la letra es determinista y siempre termina en «Pesos m/cte.»', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 999_999_999 }), (n) => {
        const letras = enLetrasPesos(n);
        expect(letras).toBe(enLetrasPesos(n));
        expect(letras.endsWith(' Pesos m/cte.')).toBe(true);
        expect(letras).not.toMatch(/\s{2,}|undefined/);
      }),
      { numRuns: 200 },
    );
  });
});

describe('reglas-renovacion (porte de cuentas/reglas)', () => {
  it('mismos errores y avisos de incremento que el original', () => {
    for (const [[actual, nuevo, destino], esperado] of INCREMENTOS) {
      const r = revisarIncremento(actual, nuevo, destino, IPC, ANIO_IPC);
      expect(r.error).toBe(esperado.error);
      expect(Boolean(r.aviso)).toBe(Boolean(esperado.aviso));
    }
  });

  it('comercio no tiene tope y vivienda sube máximo el IPC', () => {
    expect(topeDeCanon(2_000_000, 'comercio', IPC)).toBeNull();
    expect(topeDeCanon(2_000_000, 'vivienda', IPC)).toBe(2_102_000);
  });
});
