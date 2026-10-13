/**
 * Habilitación de la No Renovación (Req 22.1, 22.3). Lógica pura: los motivos válidos llegan del catálogo
 * `motivo_no_renovacion` (BD, mismos valores que el Warehouse de renovaciones); el front no los define.
 * El backend revalida y escribe el motivo en la col E del Warehouse.
 */

/** `true` si el motivo elegido está entre los motivos activos del catálogo. */
export function esMotivoNoRenovacionValido(valor: string | undefined, validos: readonly string[]): boolean {
  return valor !== undefined && valor !== '' && validos.includes(valor);
}

/** El envío se habilita solo con un motivo del catálogo; las observaciones son opcionales. */
export function puedeEnviarNoRenovacion(motivo: string | undefined, validos: readonly string[]): boolean {
  return esMotivoNoRenovacionValido(motivo, validos);
}
