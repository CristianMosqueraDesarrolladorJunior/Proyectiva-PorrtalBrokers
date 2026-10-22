import type { Poliza } from '../../core/models/poliza.model';

/**
 * Urgencia de una póliza para ordenar el portafolio: primero lo que vence pronto, luego lo que se acerca, lo vencido
 * (va a inducción), lo vigente y al final lo ya cerrado (renovada o no renovada).
 */
export function prioridadRenovacion(p: Pick<Poliza, 'estado'>): number {
  switch (p.estado) {
    case 'A_PUNTO_DE_VENCER':
      return 0;
    case 'PROXIMA_A_RENOVAR':
      return 1;
    case 'VENCIDA':
      return 2;
    case 'VIGENTE':
      return 3;
    default:
      return 4;
  }
}

/** Más urgente primero; dentro de cada grupo, el vencimiento más cercano. */
export function ordenarPorUrgencia<T extends Pick<Poliza, 'estado' | 'fechaVencimiento'>>(polizas: readonly T[]): T[] {
  return [...polizas].sort(
    (a, b) => prioridadRenovacion(a) - prioridadRenovacion(b) || String(a.fechaVencimiento).localeCompare(String(b.fechaVencimiento)),
  );
}

/** Vencida, pero todavía dentro del plazo en que se renueva (no va a inducción): sigue con «Renovar». */
export function yaVencio(p: Pick<Poliza, 'estado' | 'fechaVencimiento'>, hoy = new Date()): boolean {
  const hoyIso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  return p.estado === 'A_PUNTO_DE_VENCER' && !!p.fechaVencimiento && p.fechaVencimiento.slice(0, 10) < hoyIso;
}

/** Texto del botón según lo que hay que hacer con la póliza (no todas se «gestionan» igual). */
export function accionRenovacion(p: Pick<Poliza, 'estado' | 'gestion'>): string {
  if (p.estado === 'RENOVADA' || p.estado === 'NO_RENOVADA') return 'Ver detalle';
  if (p.estado === 'VENCIDA') return 'Inducción';
  if (p.gestion === 'Corrección pendiente') return 'Corregir';
  return 'Renovar';
}
