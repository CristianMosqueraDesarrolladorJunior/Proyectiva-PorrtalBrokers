/**
 * Lógica PURA de validación del canon de arrendamiento del Cotizador (Req 7.7, 7.8).
 *
 * Ubicación: junto al feature `cotizador`. Es lógica de presentación reutilizable,
 * sin dependencias de Angular ni de `HttpClient`, consumida por `CotizadorComponent`
 * (formulario de entrada) y por la prueba de propiedad (Property 7, tarea 9.3). El
 * backend SIEMPRE revalida la cotización antes de calcularla (Req 8.7); esta
 * validación es únicamente por UX/fail-fast.
 *
 * Todas las funciones son puras, totales y deterministas: no leen estado externo,
 * de modo que el resultado es reproducible (preparado para PBT).
 *
 * Alinea con Property 7 (design.md):
 *   Para toda entrada del campo canon, el Cotizador la considera válida si y solo si
 *   es un valor numérico estrictamente mayor a $0; cualquier valor vacío, no numérico
 *   o menor o igual a $0 impide la solicitud de cálculo e indica el campo inválido.
 *
 * _Requirements: 7.7, 7.8_
 */

/** Motivos tipados por los que el canon puede rechazarse (Property 7). */
export type MotivoCanonInvalido = 'vacio' | 'no_numerico' | 'no_positivo';

/** Resultado tipado de la validación del canon (Req 7.7, 7.8). */
export interface ResultadoValidacionCanon {
  /** Verdadero si el canon es un número estrictamente mayor a $0. */
  readonly valido: boolean;
  /** Valor numérico interpretado del canon cuando `valido === true`. */
  readonly valor?: number;
  /** Presente solo cuando `valido === false`; indica la causa del rechazo. */
  readonly motivo?: MotivoCanonInvalido;
}

/**
 * Interpreta el valor del canon a partir de una entrada de texto o número.
 *
 * Acepta tanto el valor capturado por el formulario (que puede ser `string`,
 * `number`, `null` o `undefined`) como un número directo. No usa `parseFloat`
 * (que aceptaría sufijos como "100abc"): exige que TODO el texto, tras `trim`,
 * represente un número finito.
 * Función pura y total.
 *
 * @param entrada Valor del campo canon capturado en el formulario.
 * @returns El número interpretado, o `null` si la entrada es vacía o no numérica.
 */
export function interpretarCanon(
  entrada: string | number | null | undefined,
): number | null {
  if (entrada === null || entrada === undefined) {
    return null;
  }
  if (typeof entrada === 'number') {
    return Number.isFinite(entrada) ? entrada : null;
  }
  const texto = entrada.trim();
  if (texto.length === 0) {
    return null;
  }
  const numero = Number(texto);
  if (!Number.isFinite(numero)) {
    return null;
  }
  return numero;
}

/**
 * Valida el canon de arrendamiento (Req 7.7, 7.8).
 *
 * El canon es válido si y solo si es un valor numérico estrictamente mayor a $0.
 * Cualquier valor vacío, no numérico o menor o igual a $0 se rechaza indicando el
 * motivo tipado, lo que impide la solicitud de cálculo.
 * Función pura y total.
 *
 * @param entrada Valor del campo canon capturado en el formulario.
 * @returns Resultado tipado con la validez y, si aplica, el motivo del rechazo.
 */
export function validarCanon(
  entrada: string | number | null | undefined,
): ResultadoValidacionCanon {
  const esTextoVacio = typeof entrada === 'string' && entrada.trim().length === 0;
  if (entrada === null || entrada === undefined || esTextoVacio) {
    return { valido: false, motivo: 'vacio' };
  }
  const numero = interpretarCanon(entrada);
  if (numero === null) {
    return { valido: false, motivo: 'no_numerico' };
  }
  if (numero <= 0) {
    return { valido: false, motivo: 'no_positivo' };
  }
  return { valido: true, valor: numero };
}
