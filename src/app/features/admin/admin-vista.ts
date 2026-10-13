import { VarianteBadge } from '../../shared/components';

/** Variante del badge para los estados documentales del Warehouse. */
export function varianteEstado(estado: string): VarianteBadge {
  switch (estado) {
    case 'Expedido':
      return 'success';
    case 'Pendiente Corrección Documental':
      return 'warning';
    case 'Desistido':
      return 'danger';
    default:
      return 'info';
  }
}

/** Etiqueta corta del estado para tablas. */
export function estadoCorto(estado: string): string {
  switch (estado) {
    case 'Pendiente Corrección Documental':
      return 'Pend. corrección';
    case 'Pendiente Validación Documental':
      return 'Pend. validación';
    default:
      return estado;
  }
}

/* -------------------------------------------------------------------------- */
/* Gestión total del Administrador: variantes y etiquetas de conjuntos cerrados */
/* Los valores son los identificadores externos del backend (minúsculas).      */
/* -------------------------------------------------------------------------- */

/** Variante de badge para el estado externo de un prospecto. */
export function varianteEstadoProspecto(estado: string): VarianteBadge {
  switch (estado) {
    case 'aprobado':
      return 'success';
    case 'en_revision':
    case 'suspendido':
      return 'warning';
    case 'rechazado':
    case 'inactivo':
      return 'danger';
    default:
      return 'info';
  }
}

/** Etiqueta legible del estado externo de un prospecto. */
export function etiquetaEstadoProspecto(estado: string): string {
  switch (estado) {
    case 'registrado':
      return 'Registrado';
    case 'en_revision':
      return 'En revisión';
    case 'aprobado':
      return 'Aprobado';
    case 'rechazado':
      return 'Rechazado';
    case 'suspendido':
      return 'Suspendido';
    case 'inactivo':
      return 'Inactivo';
    default:
      return estado;
  }
}

/** Variante de badge para el estado externo de una póliza del snapshot. */
export function varianteEstadoPoliza(estado: string): VarianteBadge {
  switch (estado) {
    case 'expedida':
    case 'aprobada':
      return 'success';
    case 'en_estudio':
    case 'observada':
      return 'warning';
    case 'desistida':
      return 'danger';
    default:
      return 'info';
  }
}

/** Etiqueta legible del estado externo de una póliza del snapshot. */
export function etiquetaEstadoPoliza(estado: string): string {
  switch (estado) {
    case 'radicada':
      return 'Radicada';
    case 'en_estudio':
      return 'En estudio';
    case 'aprobada':
      return 'Aprobada';
    case 'expedida':
      return 'Expedida';
    case 'observada':
      return 'Observada';
    case 'desistida':
      return 'Desistida';
    default:
      return estado;
  }
}

/** Variante de badge para el estado de gestión de una renovación. */
export function varianteEstadoRenovacion(estado: string): VarianteBadge {
  switch (estado) {
    case 'renovada':
      return 'success';
    case 'pendiente':
    case 'en_gestion':
    case 'caso_especial':
      return 'warning';
    case 'no_renovada':
      return 'danger';
    default:
      return 'info';
  }
}

/** Etiqueta legible del estado de gestión de una renovación. */
export function etiquetaEstadoRenovacion(estado: string): string {
  switch (estado) {
    case 'pendiente':
      return 'Pendiente';
    case 'en_gestion':
      return 'En gestión';
    case 'renovada':
      return 'Renovada';
    case 'no_renovada':
      return 'No renovada';
    case 'caso_especial':
      return 'Caso especial';
    default:
      return estado;
  }
}

/** Variante de badge para el estado externo de un referido. */
export function varianteEstadoReferido(estado: string): VarianteBadge {
  switch (estado) {
    case 'aceptada':
      return 'success';
    case 'en_proceso':
      return 'warning';
    case 'rechazada':
      return 'danger';
    default:
      return 'info';
  }
}

/** Etiqueta legible del estado externo de un referido. */
export function etiquetaEstadoReferido(estado: string): string {
  switch (estado) {
    case 'aceptada':
      return 'Aceptada';
    case 'en_proceso':
      return 'En proceso';
    case 'rechazada':
      return 'Rechazada';
    default:
      return estado;
  }
}

/** Variante de badge para el estado de pago de una comisión. */
export function varianteEstadoPago(estado: string): VarianteBadge {
  switch (estado) {
    case 'pagada':
      return 'success';
    case 'liquidada':
      return 'info';
    case 'pendiente':
      return 'warning';
    default:
      return 'info';
  }
}

/** Etiqueta legible del estado de pago de una comisión. */
export function etiquetaEstadoPago(estado: string): string {
  switch (estado) {
    case 'pendiente':
      return 'Pendiente';
    case 'liquidada':
      return 'Liquidada';
    case 'pagada':
      return 'Pagada';
    default:
      return estado;
  }
}
