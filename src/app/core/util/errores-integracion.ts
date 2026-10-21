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

  if (status === 409 && campo('documentoDuplicado')) {
    const tipo = fields.find((f) => f !== 'documentoDuplicado');
    return tipo
      ? `Ese archivo ya fue cargado como «${etiquetaDocumento(tipo)}». Sube un documento distinto.`
      : 'Ese archivo ya fue cargado en otro documento. Sube un documento distinto.';
  }
  if (status === 400 && campo('contratoReferencia')) {
    return 'Genera el contrato de arrendamiento antes de radicar.';
  }
  if (status === 422 && campo('archivo')) {
    return 'No pudimos leer el archivo: verifica que el PDF o la foto esté completo, legible y sin contraseña.';
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
    return 'Revisa los datos ingresados e intenta de nuevo.';
  }
  if (status === 400 && campo('archivo')) {
    return 'El archivo no se pudo cargar: debe ser PDF, JPG o PNG, no estar vacío y no superar el peso máximo indicado.';
  }
  if (status === 413) return 'El archivo pesa más de lo permitido. Comprímelo o carga uno más liviano.';
  if (status === 400 && campo('ciudad')) return 'Elige una ciudad del listado.';
  if (status === 400) return 'Hay datos incompletos o con un formato que no reconocemos. Revísalos e intenta de nuevo.';
  if (status === 409) return 'Esta acción ya no aplica: el dato ya existe o tu cuenta ya fue registrada.';
  if (status === 401 || status === 403) return 'Tu sesión no permite esta acción. Inicia sesión nuevamente.';
  if (status === 503) return 'El servicio no está disponible en este momento. Intenta en unos minutos.';
  return 'No pudimos completar la operación. Intenta de nuevo en unos minutos.';
}

/** Nombre legible de un tipo de documento en camelCase (p. ej. `certificadoTradicion` → «certificado tradicion»). */
function etiquetaDocumento(tipo: string): string {
  return tipo.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
}
