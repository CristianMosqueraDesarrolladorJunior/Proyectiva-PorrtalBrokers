/** Errores del formulario de soporte por campo; vacío si todo está bien. */
export function validarSoporte(asunto: string, observacion: string, areas: readonly string[]): Record<string, string> {
  const errores: Record<string, string> = {};
  if (areas.length === 0) errores['areas'] = 'Elige al menos una opción.';
  if (asunto.trim().length < 5) errores['asunto'] = 'Cuéntanos el asunto en al menos 5 caracteres.';
  else if (asunto.length > 200) errores['asunto'] = 'Máximo 200 caracteres.';
  if (observacion.trim().length < 10) errores['observacion'] = 'Describe la novedad en al menos 10 caracteres.';
  else if (observacion.length > 2000) errores['observacion'] = 'Máximo 2000 caracteres.';
  return errores;
}
