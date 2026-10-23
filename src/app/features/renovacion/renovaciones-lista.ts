import type { AccionRenovacion, Poliza } from '../../core/models/poliza.model';

/**
 * Acción de la póliza. La decide el backend con la regla única del área (la misma que ven comercial y administrador);
 * sin ella (respuesta antigua) se deduce del estado: cerrada, vencida → inducción, corrección o renovar.
 */
export function accionDe(p: Pick<Poliza, 'estado' | 'gestion' | 'accion'>): AccionRenovacion {
  if (p.accion) return p.accion;
  if (p.estado === 'RENOVADA' || p.estado === 'NO_RENOVADA') return 'CERRADA';
  if (p.gestion === 'Corrección pendiente') return 'CORREGIR';
  if (p.estado === 'VENCIDA') return 'INDUCCION';
  return 'RENOVAR';
}

/** Lo que dice la columna «Situación» y su color (sólido, de marca). */
export const SITUACION: Record<AccionRenovacion, { texto: string; variante: string }> = {
  RENOVAR: { texto: 'Por renovar', variante: 'warning' },
  CORREGIR: { texto: 'Corrección pendiente', variante: 'warning' },
  INDUCCION: { texto: 'Vencida · inducción', variante: 'danger' },
  EN_PROCESO: { texto: 'En proceso con el área', variante: 'info' },
  CERRADA: { texto: 'Cerrada', variante: 'success' },
};

/** Primero lo que hay que hacer: renovar, corregir, inducción; al final lo que está en proceso y lo cerrado. */
export function prioridadRenovacion(p: Pick<Poliza, 'estado' | 'gestion' | 'accion'>): number {
  switch (accionDe(p)) {
    case 'RENOVAR':
      return 0;
    case 'CORREGIR':
      return 1;
    case 'INDUCCION':
      return 2;
    case 'EN_PROCESO':
      return 3;
    default:
      return 4;
  }
}

/** Más urgente primero; dentro de cada grupo, el vencimiento más cercano. */
export function ordenarPorUrgencia<T extends Pick<Poliza, 'estado' | 'fechaVencimiento' | 'gestion' | 'accion'>>(
  polizas: readonly T[],
): T[] {
  return [...polizas].sort(
    (a, b) => prioridadRenovacion(a) - prioridadRenovacion(b) || String(a.fechaVencimiento).localeCompare(String(b.fechaVencimiento)),
  );
}

/** Texto del botón: solo lo pendiente se gestiona; lo demás se consulta. */
export function accionRenovacion(p: Pick<Poliza, 'estado' | 'gestion' | 'accion'>): string {
  switch (accionDe(p)) {
    case 'RENOVAR':
      return 'Renovar';
    case 'CORREGIR':
      return 'Corregir';
    case 'INDUCCION':
      return 'Inducción';
    default:
      return 'Ver detalle';
  }
}
