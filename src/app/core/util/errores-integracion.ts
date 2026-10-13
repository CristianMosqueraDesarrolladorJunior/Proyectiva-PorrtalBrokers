/**
 * Traduce un error HTTP del backend a un mensaje de usuario orientado a la corrección.
 *
 * El backend nunca devuelve su motivo interno; solo `status` y la lista `fields` de campos afectados.
 * Con eso se distinguen los casos de borde conocidos. El mensaje resultante NUNCA incluye trazas,
 * códigos internos ni datos personales (Req 3, 5, 9).
 */
export function mensajeErrorIntegracion(error: unknown): string {
  const e = error as { status?: number; error?: { fields?: unknown } } | null;
  const status = e?.status ?? 0;
  const fields = Array.isArray(e?.error?.fields) ? (e?.error?.fields as unknown[]).map(String) : [];
  const campo = (nombre: string) => fields.includes(nombre);

  if (status === 400 && campo('contratoReferencia')) {
    return 'Genera el contrato de arrendamiento antes de radicar.';
  }
  if (status === 422) {
    if (campo('contratoRadicado')) return 'Este contrato ya fue radicado. Genera un contrato nuevo.';
    if (campo('ciudadInmueble')) return 'La ciudad del inmueble no está soportada. Elige una ciudad del listado.';
    if (campo('contratoReferencia')) return 'No encontramos el contrato. Genéralo de nuevo antes de radicar.';
    if (campo('autorizacionDatos')) return 'Debes declarar la autorización de tratamiento de datos.';
    if (campo('numeroEstudioArrendamiento') || campo('APROBADO') || campo('PENDIENTE') || campo('NO_APROBADO')) {
      return 'El estudio de arrendamiento no está aprobado. Verifica el número de estudio y el documento.';
    }
    if (fields.length > 0) return 'Faltan documentos obligatorios por cargar.';
    return 'Revisa los datos ingresados e intenta nuevamente.';
  }
  if (status === 400) return 'Hay datos incompletos o con formato inválido. Revísalos e intenta nuevamente.';
  if (status === 401 || status === 403) return 'Tu sesión no permite esta acción. Inicia sesión nuevamente.';
  if (status === 503) return 'El servicio no está disponible en este momento. Intenta en unos minutos.';
  return 'No fue posible completar la operación. Intenta nuevamente en unos minutos.';
}
